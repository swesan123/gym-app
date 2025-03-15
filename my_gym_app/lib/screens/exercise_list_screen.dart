import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ExerciseListScreen extends StatefulWidget {
  @override
  _ExerciseListScreenState createState() => _ExerciseListScreenState();
}

class _ExerciseListScreenState extends State<ExerciseListScreen> {
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

  final TextEditingController _exerciseController = TextEditingController();

  void _addExercise(String muscleGroup) async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    String exerciseName = _exerciseController.text.trim();
    if (exerciseName.isEmpty) return;

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('exercises')
          .doc(muscleGroup)
          .collection(exerciseName)
          .add({
        'reps': 0,
        'sets': 0,
        'weight': 0,
        'date': DateTime.now(),
      });

      _exerciseController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Exercise added to $muscleGroup')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error adding exercise: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Exercise List')),
      body: ListView.builder(
        itemCount: muscleGroups.length,
        itemBuilder: (context, index) {
          String muscleGroup = muscleGroups[index];
          return ExpansionTile(
            title: Text(muscleGroup),
            children: [
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: TextField(
                  controller: _exerciseController,
                  decoration: InputDecoration(
                    labelText: 'Add Exercise',
                    suffixIcon: IconButton(
                      icon: Icon(Icons.add),
                      onPressed: () => _addExercise(muscleGroup),
                    ),
                  ),
                ),
              ),
              StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('users')
                    .doc(FirebaseAuth.instance.currentUser?.uid)
                    .collection('exercises')
                    .doc(muscleGroup)
                    .collection('exerciseList')
                    .snapshots(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return Center(child: CircularProgressIndicator());
                  }
                  var exerciseDocs = snapshot.data!.docs;
                  return ListView.builder(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    itemCount: exerciseDocs.length,
                    itemBuilder: (context, index) {
                      var exerciseDoc = exerciseDocs[index];
                      return ExpansionTile(
                        title: Text(exerciseDoc.id),
                        children: [
                          StreamBuilder<QuerySnapshot>(
                            stream: FirebaseFirestore.instance
                                .collection('users')
                                .doc(FirebaseAuth.instance.currentUser?.uid)
                                .collection('exercises')
                                .doc(muscleGroup)
                                .collection(exerciseDoc.id)
                                .snapshots(),
                            builder: (context, snapshot) {
                              if (!snapshot.hasData) {
                                return Center(
                                    child: CircularProgressIndicator());
                              }
                              var exerciseDetails = snapshot.data!.docs;
                              return ListView.builder(
                                shrinkWrap: true,
                                physics: NeverScrollableScrollPhysics(),
                                itemCount: exerciseDetails.length,
                                itemBuilder: (context, index) {
                                  var detail = exerciseDetails[index];
                                  return ListTile(
                                    title: Text(
                                        'Reps: ${detail['reps']}, Sets: ${detail['sets']}, Weight: ${detail['weight']}'),
                                    subtitle: Text(
                                        'Date: ${detail['date'].toDate()}'),
                                  );
                                },
                              );
                            },
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
