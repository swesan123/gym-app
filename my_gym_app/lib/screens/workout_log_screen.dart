import 'package:flutter/material.dart';

class WorkoutLogScreen extends StatelessWidget {
  const WorkoutLogScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Workout Log'),
      ),
      body: ListView.builder(
        itemCount: 10, // Replace with the actual number of workouts
        itemBuilder: (context, index) {
          return ListTile(
            title: Text('Workout ${index + 1}'),
            subtitle: Text('Details of workout ${index + 1}'),
          );
        },
      ),
    );
  }
}
