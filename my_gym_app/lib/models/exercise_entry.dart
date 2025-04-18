import 'package:flutter/foundation.dart';
import 'set_entry.dart';

/// A model representing an exercise performed during a workout session.
///
/// This class contains information about a specific exercise including
/// its name, any notes, and a collection of sets performed.
class ExerciseEntry {
  /// Unique identifier for the exercise entry
  final String id;

  /// Name of the exercise performed (e.g., "Bench Press", "Squat")
  final String name;

  /// Optional notes about the exercise (form tips, variations, etc.)
  final String? notes;

  /// List of sets performed for this exercise
  final List<SetEntry> sets;

  /// Creates a new [ExerciseEntry] instance
  ///
  /// [id] - Unique identifier for this exercise entry
  /// [name] - Name of the exercise
  /// [notes] - Optional notes about the exercise
  /// [sets] - List of sets performed for this exercise
  const ExerciseEntry({
    required this.id,
    required this.name,
    this.notes,
    required this.sets,
  });

  /// Creates a copy of this [ExerciseEntry] with the given fields replaced with new values
  ///
  /// This method supports immutable state management by creating a new instance
  /// rather than modifying the existing one.
  ///
  /// Returns a new [ExerciseEntry] instance with updated values.
  ExerciseEntry copyWith({
    String? id,
    String? name,
    String? notes,
    List<SetEntry>? sets,
  }) {
    return ExerciseEntry(
      id: id ?? this.id,
      name: name ?? this.name,
      notes: notes ?? this.notes,
      sets: sets ?? this.sets,
    );
  }

  /// Converts this [ExerciseEntry] to a Map for Firestore storage
  ///
  /// This method serializes all fields, including nested [SetEntry] objects,
  /// into a format suitable for Firestore storage.
  ///
  /// Returns a [Map<String, dynamic>] representation of this exercise entry.
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'notes': notes,
      'sets': sets.map((set) => set.toMap()).toList(),
    };
  }

  /// Creates an [ExerciseEntry] from a Map retrieved from Firestore
  ///
  /// This factory constructor deserializes a Map (typically from Firestore)
  /// into an ExerciseEntry object, including the nested sets collection.
  ///
  /// [map] - A Map containing the fields for an ExerciseEntry
  ///
  /// Returns a new [ExerciseEntry] instance with values from the Map.
  factory ExerciseEntry.fromMap(Map<String, dynamic> map) {
    return ExerciseEntry(
      id: map['id'] as String,
      name: map['name'] as String,
      notes: map['notes'] as String?,
      sets: List<SetEntry>.from(
        (map['sets'] as List).map(
          (set) => SetEntry.fromMap(set as Map<String, dynamic>),
        ),
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is ExerciseEntry &&
        other.id == id &&
        other.name == name &&
        other.notes == notes &&
        listEquals(other.sets, sets);
  }

  @override
  int get hashCode {
    // Create a consistent hashCode that properly handles the list
    return Object.hash(
      id,
      name,
      notes,
      Object.hashAll(sets),
    );
  }

  @override
  String toString() =>
      'ExerciseEntry(id: $id, name: $name, notes: $notes, sets: $sets)';
}
