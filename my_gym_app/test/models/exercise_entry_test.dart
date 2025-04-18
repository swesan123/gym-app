import 'package:flutter_test/flutter_test.dart';
import 'package:my_gym_app/models/exercise_entry.dart';
import 'package:my_gym_app/models/set_entry.dart';

void main() {
  group('ExerciseEntry', () {
    final mockSets = [
      SetEntry(weight: 100.0, reps: 10),
      SetEntry(weight: 110.0, reps: 8),
      SetEntry(weight: 120.0, reps: 6),
    ];

    test('creates instance with correct values', () {
      final exercise = ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        notes: 'Testing notes',
        sets: mockSets,
      );

      expect(exercise.id, 'exercise1');
      expect(exercise.name, 'Bench Press');
      expect(exercise.notes, 'Testing notes');
      expect(exercise.sets, mockSets);
      expect(exercise.sets.length, 3);
    });

    test('creates instance with null notes', () {
      final exercise = ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        sets: mockSets,
      );

      expect(exercise.id, 'exercise1');
      expect(exercise.name, 'Bench Press');
      expect(exercise.notes, null);
      expect(exercise.sets, mockSets);
    });

    test('copyWith returns a new instance with updated values', () {
      final exercise = ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        notes: 'Test notes',
        sets: mockSets,
      );

      final newSets = [
        SetEntry(weight: 130.0, reps: 8),
        SetEntry(weight: 140.0, reps: 6),
      ];

      final updatedExercise = exercise.copyWith(
        name: 'Incline Bench Press',
        notes: 'Updated notes',
        sets: newSets,
      );

      expect(updatedExercise.id, 'exercise1'); // unchanged
      expect(updatedExercise.name, 'Incline Bench Press');
      expect(updatedExercise.notes, 'Updated notes');
      expect(updatedExercise.sets, newSets);
      expect(updatedExercise.sets.length, 2);

      // Ensure original was not modified
      expect(exercise.name, 'Bench Press');
      expect(exercise.notes, 'Test notes');
      expect(exercise.sets.length, 3);
    });

    test('toMap converts ExerciseEntry to a Map correctly', () {
      final exercise = ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        notes: 'Test notes',
        sets: mockSets,
      );

      final map = exercise.toMap();

      expect(map['id'], 'exercise1');
      expect(map['name'], 'Bench Press');
      expect(map['notes'], 'Test notes');
      expect(map['sets'], isA<List>());
      expect(map['sets'].length, 3);
      expect(map['sets'][0]['weight'], 100.0);
      expect(map['sets'][1]['reps'], 8);
    });

    test('fromMap creates ExerciseEntry from a Map correctly', () {
      final map = {
        'id': 'exercise1',
        'name': 'Bench Press',
        'notes': 'Test notes',
        'sets': [
          {'weight': 100.0, 'reps': 10, 'durationSecs': null, 'notes': null},
          {'weight': 110.0, 'reps': 8, 'durationSecs': null, 'notes': null},
          {'weight': 120.0, 'reps': 6, 'durationSecs': null, 'notes': null},
        ],
      };

      final exercise = ExerciseEntry.fromMap(map);

      expect(exercise.id, 'exercise1');
      expect(exercise.name, 'Bench Press');
      expect(exercise.notes, 'Test notes');
      expect(exercise.sets.length, 3);
      expect(exercise.sets[0].weight, 100.0);
      expect(exercise.sets[1].reps, 8);
      expect(exercise.sets[2].weight, 120.0);
    });

    test('equality works correctly', () {
      final exercise1 = ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        notes: 'Test notes',
        sets: [
          SetEntry(weight: 100.0, reps: 10),
          SetEntry(weight: 110.0, reps: 8),
        ],
      );

      final exercise2 = ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        notes: 'Test notes',
        sets: [
          SetEntry(weight: 100.0, reps: 10),
          SetEntry(weight: 110.0, reps: 8),
        ],
      );

      final exercise3 = ExerciseEntry(
        id: 'exercise1',
        name: 'Different Exercise',
        notes: 'Test notes',
        sets: [
          SetEntry(weight: 100.0, reps: 10),
          SetEntry(weight: 110.0, reps: 8),
        ],
      );

      expect(exercise1, exercise2);
      expect(exercise1, isNot(exercise3));
      expect(exercise1.hashCode, exercise2.hashCode);
      expect(exercise1.hashCode, isNot(exercise3.hashCode));
    });

    test(
        'round-trip consistency: ExerciseEntry → toMap → fromMap → ExerciseEntry',
        () {
      final original = ExerciseEntry(
        id: 'exercise1',
        name: 'Bench Press',
        notes: 'Test notes',
        sets: mockSets,
      );

      final map = original.toMap();
      final recreated = ExerciseEntry.fromMap(map);

      expect(recreated, original);
    });
  });
}
