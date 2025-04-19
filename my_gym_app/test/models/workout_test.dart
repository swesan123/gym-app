import 'package:flutter_test/flutter_test.dart';
import 'package:my_gym_app/models/workout.dart';
import 'package:my_gym_app/models/exercise_entry.dart';
import 'package:my_gym_app/models/set_entry.dart';

void main() {
  group('Workout', () {
    final mockDate = DateTime(2025, 4, 15, 10, 30);

    final mockExercises = [
      ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        notes: 'Good form',
        sets: [
          SetEntry(weight: 100.0, reps: 10),
          SetEntry(weight: 110.0, reps: 8),
        ],
      ),
      ExerciseEntry(
        id: 'exercise2',
        name: 'Squat',
        sets: [
          SetEntry(weight: 150.0, reps: 8),
          SetEntry(weight: 160.0, reps: 6),
        ],
      ),
    ];

    test('creates instance with correct values', () {
      final workout = Workout(
        id: 'workout1',
        date: mockDate,
        exercises: mockExercises,
      );

      expect(workout.id, 'workout1');
      expect(workout.date, mockDate);
      expect(workout.exercises, mockExercises);
      expect(workout.exercises.length, 2);
    });

    test('copyWith returns a new instance with updated values', () {
      final workout = Workout(
        id: 'workout1',
        date: mockDate,
        exercises: mockExercises,
      );

      final newDate = DateTime(2025, 4, 16, 11, 0);
      final newExercises = [
        ExerciseEntry(
          id: 'exercise3',
          name: 'Deadlift',
          sets: [
            SetEntry(weight: 180.0, reps: 5),
          ],
        ),
      ];

      final updatedWorkout = workout.copyWith(
        date: newDate,
        exercises: newExercises,
      );

      expect(updatedWorkout.id, 'workout1'); // unchanged
      expect(updatedWorkout.date, newDate);
      expect(updatedWorkout.exercises, newExercises);
      expect(updatedWorkout.exercises.length, 1);

      // Ensure original was not modified
      expect(workout.date, mockDate);
      expect(workout.exercises.length, 2);
    });

    test('toMap converts Workout to a Map correctly', () {
      final workout = Workout(
        id: 'workout1',
        date: mockDate,
        exercises: mockExercises,
      );

      final map = workout.toMap();

      expect(map['id'], 'workout1');
      expect(map['date'], mockDate.toIso8601String());
      expect(map['exercises'], isA<List>());
      expect(map['exercises'].length, 2);
      expect(map['exercises'][0]['id'], 'exercise1');
      expect(map['exercises'][1]['name'], 'Squat');
    });

    test('fromMap creates Workout from a Map correctly', () {
      final map = {
        'id': 'workout1',
        'date': mockDate.toIso8601String(),
        'exercises': [
          {
            'id': 'exercise1',
            'name': 'Bench Press',
            'notes': 'Good form',
            'sets': [
              {
                'weight': 100.0,
                'reps': 10,
                'durationSecs': null,
                'notes': null
              },
              {'weight': 110.0, 'reps': 8, 'durationSecs': null, 'notes': null},
            ],
          },
          {
            'id': 'exercise2',
            'name': 'Squat',
            'notes': null,
            'sets': [
              {'weight': 150.0, 'reps': 8, 'durationSecs': null, 'notes': null},
              {'weight': 160.0, 'reps': 6, 'durationSecs': null, 'notes': null},
            ],
          },
        ],
      };

      final workout = Workout.fromMap(map);

      expect(workout.id, 'workout1');
      expect(workout.date.year, mockDate.year);
      expect(workout.date.month, mockDate.month);
      expect(workout.date.day, mockDate.day);
      expect(workout.exercises.length, 2);
      expect(workout.exercises[0].id, 'exercise1');
      expect(workout.exercises[0].name, 'Bench Press');
      expect(workout.exercises[0].sets.length, 2);
      expect(workout.exercises[1].name, 'Squat');
      expect(workout.exercises[1].notes, null);
    });

    test('equality works correctly', () {
      final workout1 = Workout(
        id: 'workout1',
        date: mockDate,
        exercises: mockExercises,
      );

      final workout2 = Workout(
        id: 'workout1',
        date: mockDate,
        exercises: mockExercises,
      );

      final workout3 = Workout(
        id: 'workout2',
        date: mockDate,
        exercises: mockExercises,
      );

      final workout4 = Workout(
        id: 'workout1',
        date: DateTime(2025, 4, 16, 10, 30), // Different date
        exercises: mockExercises,
      );

      expect(workout1, workout2);
      expect(workout1, isNot(workout3));
      expect(workout1, isNot(workout4));
      expect(workout1.hashCode, workout2.hashCode);
      expect(workout1.hashCode, isNot(workout3.hashCode));
    });

    test('round-trip consistency: Workout → toMap → fromMap → Workout', () {
      final original = Workout(
        id: 'workout1',
        date: mockDate,
        exercises: mockExercises,
      );

      final map = original.toMap();
      final recreated = Workout.fromMap(map);

      expect(recreated, original);
    });
  });
}
