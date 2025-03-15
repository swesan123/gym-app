import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:developer' as developer;
import '../widgets/exercise_table.dart';
import '../models/workout_entry.dart';

class ProgramEntryScreen extends StatefulWidget {
  final String userId;
  final String programId;
  final String entryId;

  ProgramEntryScreen({
    required this.userId,
    required this.programId,
    required this.entryId,
  });

  @override
  _ProgramEntryScreenState createState() => _ProgramEntryScreenState();
}

class _ProgramEntryScreenState extends State<ProgramEntryScreen> {
  final List<WorkoutEntry> _workoutEntries = [];
  bool _hasChanges = false;

  @override
  void initState() {
    super.initState();
    _loadEntry();
  }

  void _addWorkoutEntry() {
    setState(() {
      _workoutEntries.add(WorkoutEntry(
        id: '',
        userId: widget.userId,
        exercise: '',
        sets: 0,
        reps: 0,
        weight: 0.0,
        date: DateTime.now(),
      ));
      _hasChanges = true;
    });
  }

  Future<void> _loadEntry() async {
    try {
      DocumentSnapshot entryDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(widget.userId)
          .collection('programs')
          .doc(widget.programId)
          .collection('entries')
          .doc(widget.entryId)
          .get();

      if (entryDoc.exists) {
        var data = entryDoc.data() as Map<String, dynamic>;
        List<dynamic> exercises = data['exercises'];
        setState(() {
          _workoutEntries.clear();
          for (var exercise in exercises) {
            _workoutEntries.add(WorkoutEntry.fromMap('', exercise));
          }
        });
      }
    } catch (e) {
      developer.log("Error loading entry: $e", level: 1000);
    }
  }

  Future<void> _saveEntry() async {
    if (!_hasChanges) return;

    if (_workoutEntries.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please add at least one exercise')),
      );
      return;
    }

    try {
      String dateTime = DateTime.now().toIso8601String();
      String uniqueId = DateTime.now().millisecondsSinceEpoch.toString();

      // Prepare the exercises data
      List<Map<String, dynamic>> exercises = _workoutEntries.map((entry) {
        return entry.toMap();
      }).toList();

      // Update the entry metadata and exercises in the program's entries subcollection
      await FirebaseFirestore.instance
          .collection('users')
          .doc(widget.userId)
          .collection('programs')
          .doc(widget.programId)
          .collection('entries')
          .doc(widget.entryId)
          .update({
        'entryName': widget.entryId, // Ensure entryName is set
        'exercises': exercises,
        'date': dateTime,
      });

      // Create a new entry in the user's entries collection
      await FirebaseFirestore.instance
          .collection('users')
          .doc(widget.userId)
          .collection('entries')
          .doc(uniqueId)
          .set({
        'programId': widget.programId,
        'entryId': uniqueId,
        'entryName': widget.entryId, // Ensure entryName is set
        'exercises': exercises,
        'date': dateTime,
      });

      // Save the exercises to the user's exercises collection
      for (var exercise in exercises) {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(widget.userId)
            .collection('exercises')
            .add(exercise);
      }

      developer.log("Entry and exercises saved successfully.", level: 800);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Entry Saved!')));

      setState(() {
        _hasChanges = false;
      });
    } catch (e) {
      developer.log("Error saving entry: $e", level: 1000);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error saving entry')));
    }
  }

  Future<void> _deleteWorkoutEntry(int index) async {
    setState(() {
      _workoutEntries.removeAt(index);
      _hasChanges = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        await _saveEntry();
        return true;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.entryId),
          actions: [
            Padding(
              padding:
                  const EdgeInsets.only(right: 16.0), // Shift the button left
              child: IconButton(
                icon: Icon(Icons.check, color: Colors.white),
                onPressed: _saveEntry,
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.only(right: 16.0), // Shift the button left
              child: IconButton(
                icon: Icon(Icons.add, color: Colors.white),
                onPressed: _addWorkoutEntry,
              ),
            ),
          ],
        ),
        body: ExerciseTable(
          workoutEntries: _workoutEntries,
          onDelete: _deleteWorkoutEntry,
          onChanged: () {
            setState(() {
              _hasChanges = true;
            });
          },
        ),
      ),
    );
  }
}
