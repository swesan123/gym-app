import 'package:flutter/foundation.dart';
import 'exercise_entry.dart';

/// A model representing a complete workout session.
///
/// This class contains information about a workout including
/// its unique identifier, the date it was performed, and
/// the collection of exercises completed during the session.
class Workout {
  /// Unique identifier for the workout
  final String id;

  /// Date when the workout was performed
  final DateTime date;

  /// Collection of exercises performed during this workout
  final List<ExerciseEntry> exercises;

  /// Creates a new [Workout] instance
  ///
  /// [id] - Unique identifier for this workout
  /// [date] - The date when this workout was performed
  /// [exercises] - List of exercises completed during this workout
  const Workout({
    required this.id,
    required this.date,
    required this.exercises,
  });

  /// Creates a copy of this [Workout] with the given fields replaced with new values
  ///
  /// This method is useful for immutable state updates throughout the application.
  ///
  /// Returns a new [Workout] instance with updated values.
  Workout copyWith({
    String? id,
    DateTime? date,
    List<ExerciseEntry>? exercises,
  }) {
    return Workout(
      id: id ?? this.id,
      date: date ?? this.date,
      exercises: exercises ?? this.exercises,
    );
  }

  /// Converts this [Workout] to a Map for Firestore storage
  ///
  /// This method serializes all fields, including nested [ExerciseEntry] objects,
  /// into a format suitable for Firestore storage.
  ///
  /// Returns a [Map<String, dynamic>] representation of this workout.
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'exercises': exercises.map((exercise) => exercise.toMap()).toList(),
    };
  }

  /// Creates a [Workout] from a Map retrieved from Firestore
  ///
  /// This factory constructor deserializes a Map (typically from Firestore)
  /// into a Workout object, including the nested exercises collection.
  ///
  /// [map] - A Map containing the fields for a Workout
  ///
  /// Returns a new [Workout] instance with values from the Map.
  factory Workout.fromMap(Map<String, dynamic> map) {
    return Workout(
      id: map['id'] as String,
      date: DateTime.parse(map['date'] as String),
      exercises: List<ExerciseEntry>.from(
        (map['exercises'] as List).map(
          (exercise) => ExerciseEntry.fromMap(exercise as Map<String, dynamic>),
        ),
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is Workout &&
        other.id == id &&
        other.date.isAtSameMomentAs(date) &&
        listEquals(other.exercises, exercises);
  }

  @override
  int get hashCode {
    // Create a consistent hashCode that properly handles the list
    return Object.hash(
      id,
      date,
      Object.hashAll(exercises),
    );
  }

  @override
  String toString() => 'Workout(id: $id, date: $date, exercises: $exercises)';
}
