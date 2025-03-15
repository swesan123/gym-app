import 'package:flutter/material.dart';
import 'entries_screen.dart';
import 'exercise_list_screen.dart';
import 'progress_tracking_screen.dart';
import 'account_screen.dart';
import 'programs_screen.dart'; // Import the ProgramsScreen
import 'in_progress_workout_screen.dart'; // Import the InProgressWorkoutScreen

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  final List<Widget> _screens = [
    InProgressWorkoutScreen(), // Add InProgressWorkoutScreen to the list
    ProgramsScreen(), // Add ProgramsScreen to the list
    EntriesScreen(), // Update to EntriesScreen
    ExerciseListScreen(),
    ProgressTrackingScreen(),
    AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: [
          BottomNavigationBarItem(
              icon: Icon(Icons.fitness_center),
              label: 'Workout'), // Add Workout item
          BottomNavigationBarItem(
              icon: Icon(Icons.list_alt),
              label: 'Programs'), // Add Programs item
          BottomNavigationBarItem(icon: Icon(Icons.book), label: 'Entries'),
          BottomNavigationBarItem(icon: Icon(Icons.list), label: 'Exercises'),
          BottomNavigationBarItem(
              icon: Icon(Icons.show_chart), label: 'Progress'),
          BottomNavigationBarItem(
              icon: Icon(Icons.account_circle), label: 'Account'),
        ],
        backgroundColor: Colors.white, // Set the background color to white
        selectedItemColor: Colors.blue, // Set the color of the selected item
        unselectedItemColor:
            Colors.grey, // Set the color of the unselected items
      ),
    );
  }
}
