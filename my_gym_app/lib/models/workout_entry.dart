class WorkoutEntry {
  String id;
  String userId;
  String exercise;
  int sets;
  int reps;
  double weight;
  DateTime date;

  WorkoutEntry({
    required this.id,
    required this.userId,
    required this.exercise,
    required this.sets,
    required this.reps,
    required this.weight,
    required this.date,
  });

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'exercise': exercise,
      'sets': sets,
      'reps': reps,
      'weight': weight,
      'date': date.toIso8601String(),
    };
  }

  static WorkoutEntry fromMap(String id, Map<String, dynamic> data) {
    return WorkoutEntry(
      id: id,
      userId: data['userId'],
      exercise: data['exercise'],
      sets: data['sets'],
      reps: data['reps'],
      weight: data['weight'],
      date: DateTime.parse(data['date']),
    );
  }
}
