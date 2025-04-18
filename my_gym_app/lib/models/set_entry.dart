/// A model representing a single set of an exercise performed during a workout.
///
/// This class contains details about a specific exercise set including weight,
/// repetitions, duration (for timed exercises), and optional notes.
class SetEntry {
  /// The weight used in this set, typically in kg or lbs
  final double? weight;

  /// The number of repetitions performed in this set
  final int? reps;

  /// The duration of the set in seconds (for timed exercises like planks)
  final int? durationSecs;

  /// Optional notes about the set (e.g., "felt strong", "struggled with form")
  final String? notes;

  /// Creates a new [SetEntry] instance
  ///
  /// All parameters are optional to accommodate different types of exercises:
  /// - Weighted exercises typically use [weight] and [reps]
  /// - Bodyweight exercises might use only [reps]
  /// - Timed exercises might use [durationSecs] instead of [reps]
  /// - [notes] can be used to record observations about the set
  const SetEntry({
    this.weight,
    this.reps,
    this.durationSecs,
    this.notes,
  });

  /// Creates a copy of this [SetEntry] with the given fields replaced with new values
  ///
  /// This method is useful for updating a set without modifying the original,
  /// maintaining immutability throughout the application.
  ///
  /// Returns a new [SetEntry] instance with updated values.
  SetEntry copyWith({
    double? weight,
    int? reps,
    int? durationSecs,
    String? notes,
  }) {
    return SetEntry(
      weight: weight ?? this.weight,
      reps: reps ?? this.reps,
      durationSecs: durationSecs ?? this.durationSecs,
      notes: notes ?? this.notes,
    );
  }

  /// Converts this [SetEntry] to a Map for Firestore storage
  ///
  /// The resulting Map can be directly stored in Firestore or
  /// used with other serialization methods.
  ///
  /// Returns a [Map<String, dynamic>] with all fields of this set.
  Map<String, dynamic> toMap() {
    return {
      'weight': weight,
      'reps': reps,
      'durationSecs': durationSecs,
      'notes': notes,
    };
  }

  /// Creates a [SetEntry] from a Map retrieved from Firestore
  ///
  /// This factory constructor converts a Map (typically retrieved from Firestore)
  /// back into a SetEntry object.
  ///
  /// [map] - A Map containing the fields for a SetEntry
  ///
  /// Returns a new [SetEntry] instance with values from the Map.
  factory SetEntry.fromMap(Map<String, dynamic> map) {
    return SetEntry(
      weight: map['weight'] != null ? (map['weight'] as num).toDouble() : null,
      reps: map['reps'] as int?,
      durationSecs: map['durationSecs'] as int?,
      notes: map['notes'] as String?,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is SetEntry &&
        other.weight == weight &&
        other.reps == reps &&
        other.durationSecs == durationSecs &&
        other.notes == notes;
  }

  @override
  int get hashCode => Object.hash(
        weight,
        reps,
        durationSecs,
        notes,
      );

  @override
  String toString() =>
      'SetEntry(weight: $weight, reps: $reps, durationSecs: $durationSecs, notes: $notes)';
}
