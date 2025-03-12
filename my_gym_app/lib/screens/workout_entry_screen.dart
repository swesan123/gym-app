import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:developer' as developer;

class WorkoutEntryScreen extends StatefulWidget {
  @override
  _WorkoutEntryScreenState createState() => _WorkoutEntryScreenState();
}

class _WorkoutEntryScreenState extends State<WorkoutEntryScreen> {
  final List<WorkoutEntry> _workoutEntries = [];

  void _addWorkoutEntry() {
    setState(() {
      _workoutEntries.add(WorkoutEntry());
    });
  }

  Future<void> _saveWorkout(WorkoutEntry entry) async {
    try {
      User? user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        developer.log("No user is currently signed in.", level: 1000);
        return;
      }

      // Check if all fields are filled in
      if (entry.exerciseController.text.trim().isEmpty ||
          entry.setsController.text.trim().isEmpty ||
          entry.repsController.text.trim().isEmpty ||
          entry.weightController.text.trim().isEmpty) {
        developer.log("Skipping save because not all fields are filled.",
            level: 800);
        return;
      }

      developer.log("Saving workout for user: ${user.uid}", level: 800);

      // Check if an exercise with the same name already exists
      QuerySnapshot querySnapshot = await FirebaseFirestore.instance
          .collection('workouts')
          .where('userId', isEqualTo: user.uid)
          .where('exercise', isEqualTo: entry.exerciseController.text.trim())
          .get();

      if (querySnapshot.docs.isNotEmpty) {
        // Update the existing exercise
        DocumentSnapshot documentSnapshot = querySnapshot.docs.first;
        await FirebaseFirestore.instance
            .collection('workouts')
            .doc(documentSnapshot.id)
            .update({
          'sets': int.parse(entry.setsController.text),
          'reps': int.parse(entry.repsController.text),
          'weight': double.parse(entry.weightController.text),
          'date': DateTime.now().toIso8601String(),
        });
        developer.log("Workout updated successfully.", level: 800);
      } else {
        // Create a new exercise
        await FirebaseFirestore.instance.collection('workouts').add({
          'userId': user.uid,
          'exercise': entry.exerciseController.text.trim(),
          'sets': int.parse(entry.setsController.text),
          'reps': int.parse(entry.repsController.text),
          'weight': double.parse(entry.weightController.text),
          'date': DateTime.now().toIso8601String(),
        });
        developer.log("Workout saved successfully.", level: 800);
      }

      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Workout Saved!')));
    } catch (e) {
      developer.log("Error saving workout: $e", level: 1000);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error saving workout')));
    }
  }

  @override
  Widget build(BuildContext context) {
    User? user = FirebaseAuth.instance.currentUser;

    developer.log("Building WorkoutEntryScreen for user: ${user?.uid}",
        level: 800);

    return Scaffold(
      appBar: AppBar(title: Text('Workout Entry')),
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
              },
              children: _workoutEntries.map((entry) {
                return TableRow(
                  children: [
                    Padding(
                      padding: EdgeInsets.all(8.0),
                      child: Focus(
                        onFocusChange: (hasFocus) {
                          if (!hasFocus) {
                            _saveWorkout(entry);
                          }
                        },
                        child: TextField(
                          controller: entry.exerciseController,
                          decoration: InputDecoration(labelText: 'Exercise'),
                        ),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.all(8.0),
                      child: Focus(
                        onFocusChange: (hasFocus) {
                          if (!hasFocus) {
                            _saveWorkout(entry);
                          }
                        },
                        child: TextField(
                          controller: entry.setsController,
                          decoration: InputDecoration(labelText: 'Sets'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.all(8.0),
                      child: Focus(
                        onFocusChange: (hasFocus) {
                          if (!hasFocus) {
                            _saveWorkout(entry);
                          }
                        },
                        child: TextField(
                          controller: entry.repsController,
                          decoration: InputDecoration(labelText: 'Reps'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.all(8.0),
                      child: Focus(
                        onFocusChange: (hasFocus) {
                          if (!hasFocus) {
                            _saveWorkout(entry);
                          }
                        },
                        child: TextField(
                          controller: entry.weightController,
                          decoration: InputDecoration(labelText: 'Weight (kg)'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
          SizedBox(height: 20),
          ElevatedButton(
            onPressed: _addWorkoutEntry,
            child: Text('Add Exercise'),
          ),
        ],
      ),
    );
  }
}

class WorkoutEntry {
  final TextEditingController exerciseController = TextEditingController();
  final TextEditingController setsController = TextEditingController();
  final TextEditingController repsController = TextEditingController();
  final TextEditingController weightController = TextEditingController();
}
