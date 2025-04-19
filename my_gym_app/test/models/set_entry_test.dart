import 'package:flutter_test/flutter_test.dart';
import 'package:my_gym_app/models/set_entry.dart';

void main() {
  group('SetEntry', () {
    test('creates instance with correct values', () {
      final setEntry = SetEntry(
        weight: 100.5,
        reps: 10,
        durationSecs: 60,
        notes: 'Test notes',
      );

      expect(setEntry.weight, 100.5);
      expect(setEntry.reps, 10);
      expect(setEntry.durationSecs, 60);
      expect(setEntry.notes, 'Test notes');
    });

    test('creates instance with null values', () {
      final setEntry = SetEntry();

      expect(setEntry.weight, null);
      expect(setEntry.reps, null);
      expect(setEntry.durationSecs, null);
      expect(setEntry.notes, null);
    });

    test('copyWith returns a new instance with updated values', () {
      final setEntry = SetEntry(
        weight: 100.5,
        reps: 10,
        durationSecs: 60,
        notes: 'Test notes',
      );

      final updatedSetEntry = setEntry.copyWith(
        weight: 120.5,
        notes: 'Updated notes',
      );

      expect(updatedSetEntry.weight, 120.5);
      expect(updatedSetEntry.reps, 10);
      expect(updatedSetEntry.durationSecs, 60);
      expect(updatedSetEntry.notes, 'Updated notes');

      // Ensure original is not modified
      expect(setEntry.weight, 100.5);
      expect(setEntry.notes, 'Test notes');
    });

    test('toMap converts SetEntry to a Map correctly', () {
      final setEntry = SetEntry(
        weight: 100.5,
        reps: 10,
        durationSecs: 60,
        notes: 'Test notes',
      );

      final map = setEntry.toMap();

      expect(map['weight'], 100.5);
      expect(map['reps'], 10);
      expect(map['durationSecs'], 60);
      expect(map['notes'], 'Test notes');
    });

    test('fromMap creates SetEntry from a Map correctly', () {
      final map = {
        'weight': 100.5,
        'reps': 10,
        'durationSecs': 60,
        'notes': 'Test notes',
      };

      final setEntry = SetEntry.fromMap(map);

      expect(setEntry.weight, 100.5);
      expect(setEntry.reps, 10);
      expect(setEntry.durationSecs, 60);
      expect(setEntry.notes, 'Test notes');
    });

    test('fromMap handles null values correctly', () {
      final map = {
        'weight': null,
        'reps': null,
        'durationSecs': null,
        'notes': null,
      };

      final setEntry = SetEntry.fromMap(map);

      expect(setEntry.weight, null);
      expect(setEntry.reps, null);
      expect(setEntry.durationSecs, null);
      expect(setEntry.notes, null);
    });

    test('equality works correctly', () {
      final setEntry1 = SetEntry(
        weight: 100.5,
        reps: 10,
        durationSecs: 60,
        notes: 'Test notes',
      );

      final setEntry2 = SetEntry(
        weight: 100.5,
        reps: 10,
        durationSecs: 60,
        notes: 'Test notes',
      );

      final setEntry3 = SetEntry(
        weight: 120.5,
        reps: 10,
        durationSecs: 60,
        notes: 'Test notes',
      );

      expect(setEntry1, setEntry2);
      expect(setEntry1, isNot(setEntry3));
      expect(setEntry1.hashCode, setEntry2.hashCode);
      expect(setEntry1.hashCode, isNot(setEntry3.hashCode));
    });

    test('round-trip consistency: SetEntry → toMap → fromMap → SetEntry', () {
      final original = SetEntry(
        weight: 100.5,
        reps: 10,
        durationSecs: 60,
        notes: 'Test notes',
      );

      final map = original.toMap();
      final recreated = SetEntry.fromMap(map);

      expect(recreated, original);
    });
  });
}
