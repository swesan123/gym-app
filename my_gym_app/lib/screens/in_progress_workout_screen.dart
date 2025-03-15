import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:developer' as developer;
import '../widgets/exercise_table.dart';
import '../models/workout_entry.dart';

class InProgressWorkoutScreen extends StatefulWidget {
  @override
  _InProgressWorkoutScreenState createState() =>
      _InProgressWorkoutScreenState();
}

class _InProgressWorkoutScreenState extends State<InProgressWorkoutScreen> {
  final List<String> workoutOrder = ['Push', 'Pull', 'Legs'];
  int currentIndex = 0;
  bool isDone = false;
  List<WorkoutEntry> _workoutEntries = [];
  String entryName = '';

  @override
  void initState() {
    super.initState();
    _loadCurrentWorkout();
  }

  Future<void> _loadCurrentWorkout() async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      developer.log("User is not authenticated", level: 1000);
      return;
    }

    try {
      DocumentReference workoutDocRef = FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('workout')
          .doc('current');

      DocumentSnapshot workoutDoc = await workoutDocRef.get();

      if (!workoutDoc.exists) {
        // Create the workout document if it doesn't exist
        await workoutDocRef.set({
          'currentWorkoutIndex': 0,
          'isDone': false,
        });
        workoutDoc = await workoutDocRef.get();
        developer.log("Workout document created: ${workoutDoc.data()}",
            level: 800);
      } else {
        developer.log("Workout document: ${workoutDoc.data()}", level: 800);
      }

      var data = workoutDoc.data() as Map<String, dynamic>;
      setState(() {
        currentIndex = data['currentWorkoutIndex'] ?? 0;
        isDone = data['isDone'] ?? false;
      });
      developer.log(
          "Current workout loaded: index=$currentIndex, isDone=$isDone",
          level: 800);
      _loadCurrentEntry();
    } catch (e) {
      developer.log("Error loading current workout: $e", level: 1000);
    }
  }

  Future<void> _loadCurrentEntry() async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      developer.log("User is not authenticated", level: 1000);
      return;
    }

    try {
      QuerySnapshot entrySnapshot = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('programs')
          .doc('PPL') // Assuming the program ID is 'PPL'
          .collection('entries')
          .where('entryName', isEqualTo: workoutOrder[currentIndex])
          .get();

      if (entrySnapshot.docs.isNotEmpty) {
        var data = entrySnapshot.docs.first.data() as Map<String, dynamic>;
        List<dynamic> exercises = data['exercises'];
        setState(() {
          entryName = data['entryName'] ?? '';
          _workoutEntries.clear();
          for (var exercise in exercises) {
            _workoutEntries.add(WorkoutEntry.fromMap('', exercise));
          }
        });
        developer.log("Current entry loaded: $data", level: 800);
      } else {
        developer.log("No entry found for ${workoutOrder[currentIndex]}",
            level: 800);
      }
    } catch (e) {
      developer.log("Error loading current entry: $e", level: 1000);
    }
  }

  Future<void> _saveCurrentWorkout() async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      developer.log("User is not authenticated", level: 1000);
      return;
    }

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('workout')
          .doc('current')
          .set({
        'currentWorkoutIndex': currentIndex,
        'isDone': isDone,
      });
      developer.log(
          "Current workout saved: index=$currentIndex, isDone=$isDone",
          level: 800);
    } catch (e) {
      developer.log("Error saving current workout: $e", level: 1000);
    }
  }

  void _completeCurrentWorkout() {
    setState(() {
      if (currentIndex < workoutOrder.length - 1) {
        currentIndex++;
      } else {
        currentIndex = 0;
        isDone = true;
      }
    });
    _saveCurrentWorkout();
    _loadCurrentEntry();
  }

  void _deleteWorkoutEntry(int index) {
    setState(() {
      _workoutEntries.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('In Progress Workout'),
        actions: [
          Padding(
            padding:
                const EdgeInsets.only(right: 40.0), // Shift the button left
            child: IconButton(
              icon: Icon(Icons.check, color: Colors.white),
              onPressed: _completeCurrentWorkout,
            ),
          ),
        ],
      ),
      body: _workoutEntries.isEmpty
          ? Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    entryName,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ),
                Expanded(
                  child: ExerciseTable(
                    workoutEntries: _workoutEntries,
                    onDelete: _deleteWorkoutEntry,
                    onChanged: () {
                      setState(() {});
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
