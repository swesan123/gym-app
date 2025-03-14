import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:developer' as developer;

class WorkoutEntryScreen extends StatefulWidget {
  final String? entryId;
  final String? entryName;

  WorkoutEntryScreen({this.entryId, this.entryName});

  @override
  _WorkoutEntryScreenState createState() => _WorkoutEntryScreenState();
}

class _WorkoutEntryScreenState extends State<WorkoutEntryScreen> {
  final List<WorkoutEntry> _workoutEntries = [];
  final TextEditingController entryNameController = TextEditingController();
  int entryCount = 1;
  bool _hasChanges = false;

  @override
  void initState() {
    super.initState();
    if (widget.entryId != null) {
      _loadEntry(widget.entryId!);
    } else {
      _setDefaultEntryName();
    }
  }

  void _setDefaultEntryName() {
    entryNameController.text = 'Entry$entryCount';
  }

  void _addWorkoutEntry() {
    setState(() {
      _workoutEntries.add(WorkoutEntry());
      _hasChanges = true;
    });
  }

  Future<void> _loadEntry(String entryId) async {
    try {
      DocumentSnapshot entryDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(FirebaseAuth.instance.currentUser!.uid)
          .collection('entries')
          .doc(entryId)
          .get();

      if (entryDoc.exists) {
        var data = entryDoc.data() as Map<String, dynamic>;
        entryNameController.text = data['entryName'];
        List<dynamic> exercises = data['exercises'];
        setState(() {
          _workoutEntries.clear();
          for (var exercise in exercises) {
            _workoutEntries.add(WorkoutEntry.fromMap(exercise));
          }
        });
      }
    } catch (e) {
      developer.log("Error loading entry: $e", level: 1000);
    }
  }

  Future<void> _saveEntry() async {
    if (!_hasChanges) return;

    try {
      User? user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        developer.log("No user is currently signed in.", level: 1000);
        return;
      }

      String entryId = widget.entryId ??
          FirebaseFirestore.instance.collection('entries').doc().id;
      String entryName = entryNameController.text.trim();
      String dateTime = DateTime.now().toIso8601String();

      // Prepare the exercises data
      List<Map<String, dynamic>> exercises = _workoutEntries.map((entry) {
        return {
          'exercise': entry.exerciseController.text.trim(),
          'sets': int.parse(entry.setsController.text),
          'reps': int.parse(entry.repsController.text),
          'weight': double.parse(entry.weightController.text),
        };
      }).toList();

      // Save the entry metadata and exercises in the user's entries subcollection
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('entries')
          .doc(entryId)
          .set({
        'userId': user.uid,
        'entryName': entryName,
        'date': dateTime,
        'exercises': exercises,
      });

      // Save each exercise as a separate document in the user's exercises subcollection
      for (var entry in _workoutEntries) {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .collection('exercises')
            .add({
          'entryId': entryId,
          'exercise': entry.exerciseController.text.trim(),
          'sets': int.parse(entry.setsController.text),
          'reps': int.parse(entry.repsController.text),
          'weight': double.parse(entry.weightController.text),
          'date': dateTime,
        });
      }

      developer.log("Entry and exercises saved successfully.", level: 800);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Entry Saved!')));

      // Clear the entries and set a new default entry name
      setState(() {
        _workoutEntries.clear();
        entryCount++;
        _setDefaultEntryName();
        _hasChanges = false;
      });
    } catch (e) {
      developer.log("Error saving entry: $e", level: 1000);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error saving entry')));
    }
  }

  Future<void> _deleteEntry() async {
    try {
      if (widget.entryId != null) {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(FirebaseAuth.instance.currentUser!.uid)
            .collection('entries')
            .doc(widget.entryId)
            .delete();
        developer.log("Entry deleted successfully.", level: 800);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Entry Deleted!')));
        Navigator.pop(context);
      }
    } catch (e) {
      developer.log("Error deleting entry: $e", level: 1000);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error deleting entry')));
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
    User? user = FirebaseAuth.instance.currentUser;

    developer.log("Building WorkoutEntryScreen for user: ${user?.uid}",
        level: 800);

    return WillPopScope(
      onWillPop: () async {
        await _saveEntry();
        return true;
      },
      child: Scaffold(
        appBar: AppBar(
          title: TextField(
            controller: entryNameController,
            decoration: InputDecoration(
              hintText: 'Entry Name',
              border: InputBorder.none,
              hintStyle: TextStyle(color: Colors.grey),
            ),
            style: TextStyle(color: Colors.grey, fontSize: 20),
            textAlign: TextAlign.center,
            onChanged: (value) {
              _hasChanges = true;
            },
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.delete, color: Colors.red),
              onPressed: _deleteEntry,
            ),
            Padding(
              padding:
                  const EdgeInsets.only(right: 32.0), // Shift the button left
              child: IconButton(
                icon: Icon(Icons.add, color: Colors.grey),
                onPressed: _addWorkoutEntry,
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            Padding(
              padding: EdgeInsets.all(16.0),
              child: Table(
                border: TableBorder.all(),
                columnWidths: {
                  0: FlexColumnWidth(2),
                  1: FlexColumnWidth(1),
                  2: FlexColumnWidth(1),
                  3: FlexColumnWidth(1),
                  4: FlexColumnWidth(0.5),
                },
                children: _workoutEntries.asMap().entries.map((entry) {
                  int index = entry.key;
                  WorkoutEntry workoutEntry = entry.value;
                  return TableRow(
                    children: [
                      Padding(
                        padding: EdgeInsets.all(8.0),
                        child: TextField(
                          controller: workoutEntry.exerciseController,
                          decoration: InputDecoration(labelText: 'Exercise'),
                          onChanged: (value) {
                            _hasChanges = true;
                          },
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.all(8.0),
                        child: TextField(
                          controller: workoutEntry.setsController,
                          decoration: InputDecoration(labelText: 'Sets'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) {
                            _hasChanges = true;
                          },
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.all(8.0),
                        child: TextField(
                          controller: workoutEntry.repsController,
                          decoration: InputDecoration(labelText: 'Reps'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) {
                            _hasChanges = true;
                          },
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.all(8.0),
                        child: TextField(
                          controller: workoutEntry.weightController,
                          decoration: InputDecoration(labelText: 'Weight (kg)'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) {
                            _hasChanges = true;
                          },
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.delete, color: Colors.red),
                        onPressed: () => _deleteWorkoutEntry(index),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class WorkoutEntry {
  final TextEditingController exerciseController;
  final TextEditingController setsController;
  final TextEditingController repsController;
  final TextEditingController weightController;

  WorkoutEntry()
      : exerciseController = TextEditingController(),
        setsController = TextEditingController(),
        repsController = TextEditingController(),
        weightController = TextEditingController();

  WorkoutEntry.fromMap(Map<String, dynamic> map)
      : exerciseController = TextEditingController(text: map['exercise']),
        setsController = TextEditingController(text: map['sets'].toString()),
        repsController = TextEditingController(text: map['reps'].toString()),
        weightController =
            TextEditingController(text: map['weight'].toString());
}
