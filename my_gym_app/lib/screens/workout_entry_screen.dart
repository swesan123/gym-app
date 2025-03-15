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
  final List<String> muscleGroups = [
    'Chest',
    'Back',
    'Shoulders',
    'Arms',
    'Legs',
    'Glutes',
    'Core',
    'Neck'
  ];
  List<String> exercises = [];
  String selectedMuscleGroup = '';
  String selectedExercise = '';
  final TextEditingController _repsController = TextEditingController();
  final TextEditingController _setsController = TextEditingController();
  final TextEditingController _weightController = TextEditingController();
  final TextEditingController _newExerciseController = TextEditingController();

  Future<void> _loadExercises(String muscleGroup) async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      QuerySnapshot exerciseSnapshot = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('exercises')
          .doc(muscleGroup)
          .collection('userExercises')
          .get();

      setState(() {
        exercises = exerciseSnapshot.docs.map((doc) => doc.id).toList();
      });
    } catch (e) {
      developer.log("Error loading exercises: $e", level: 1000);
    }
  }

  Future<void> _addExercise(String muscleGroup, String exerciseName) async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('exercises')
          .doc(muscleGroup)
          .collection('userExercises')
          .doc(exerciseName)
          .set({});

      await _loadExercises(muscleGroup);
      setState(() {
        selectedExercise = exerciseName;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Exercise added to $muscleGroup')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error adding exercise: $e')),
      );
    }
  }

  Future<void> _saveWorkoutEntry() async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('exercises')
          .doc(selectedMuscleGroup)
          .collection('userExercises')
          .doc(selectedExercise)
          .collection('exerciseInfo')
          .add({
        'reps': int.parse(_repsController.text),
        'sets': int.parse(_setsController.text),
        'weight': double.parse(_weightController.text),
        'date': DateTime.now(),
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Workout entry saved')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving workout entry: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.entryName ?? 'New Workout Entry'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Table(
              columnWidths: {
                0: FlexColumnWidth(2),
                1: FlexColumnWidth(3),
                2: FlexColumnWidth(2),
                3: FlexColumnWidth(2),
                4: FlexColumnWidth(2),
              },
              children: [
                TableRow(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: DropdownButtonFormField<String>(
                        decoration: InputDecoration(labelText: 'Muscle Group'),
                        value: selectedMuscleGroup.isEmpty
                            ? null
                            : selectedMuscleGroup,
                        items: muscleGroups.map((String muscleGroup) {
                          return DropdownMenuItem<String>(
                            value: muscleGroup,
                            child: Text(muscleGroup),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            selectedMuscleGroup = value!;
                            selectedExercise = '';
                            exercises = [];
                            _loadExercises(selectedMuscleGroup);
                          });
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: DropdownButtonFormField<String>(
                        decoration: InputDecoration(labelText: 'Exercise'),
                        value:
                            selectedExercise.isEmpty ? null : selectedExercise,
                        items: selectedMuscleGroup.isEmpty
                            ? []
                            : [
                                ...exercises.map((String exercise) {
                                  return DropdownMenuItem<String>(
                                    value: exercise,
                                    child: Text(exercise),
                                  );
                                }).toList(),
                                DropdownMenuItem<String>(
                                  value: 'Add New Exercise',
                                  child: Text('Add New Exercise'),
                                ),
                              ],
                        onChanged: (value) {
                          if (value == 'Add New Exercise') {
                            showDialog(
                              context: context,
                              builder: (context) {
                                return AlertDialog(
                                  title: Text('Add New Exercise'),
                                  content: TextField(
                                    controller: _newExerciseController,
                                    decoration: InputDecoration(
                                      labelText: 'Exercise Name',
                                    ),
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () {
                                        Navigator.of(context).pop();
                                      },
                                      child: Text('Cancel'),
                                    ),
                                    TextButton(
                                      onPressed: () async {
                                        if (_newExerciseController
                                            .text.isNotEmpty) {
                                          await _addExercise(
                                              selectedMuscleGroup,
                                              _newExerciseController.text);
                                          _newExerciseController.clear();
                                          Navigator.of(context).pop();
                                        }
                                      },
                                      child: Text('Add'),
                                    ),
                                  ],
                                );
                              },
                            );
                          } else {
                            setState(() {
                              selectedExercise = value!;
                            });
                          }
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: TextField(
                        controller: _repsController,
                        decoration: InputDecoration(labelText: 'Reps'),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: TextField(
                        controller: _setsController,
                        decoration: InputDecoration(labelText: 'Sets'),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: TextField(
                        controller: _weightController,
                        decoration: InputDecoration(labelText: 'Weight'),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed:
                  selectedMuscleGroup.isNotEmpty && selectedExercise.isNotEmpty
                      ? _saveWorkoutEntry
                      : null,
              child: Text('Save Workout Entry'),
            ),
          ],
        ),
      ),
    );
  }
}
