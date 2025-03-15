import 'package:flutter/material.dart';
import '../models/workout_entry.dart';

class ExerciseTable extends StatelessWidget {
  final List<WorkoutEntry> workoutEntries;
  final Function(int) onDelete;
  final Function() onChanged;

  ExerciseTable({
    required this.workoutEntries,
    required this.onDelete,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(16.0),
      child: Table(
        border: TableBorder.all(),
        columnWidths: {
          0: FlexColumnWidth(2),
          1: FlexColumnWidth(1),
          2: FlexColumnWidth(1),
          3: FlexColumnWidth(1),
          4: FlexColumnWidth(0.5),
        },
        children: workoutEntries.asMap().entries.map((entry) {
          int index = entry.key;
          WorkoutEntry workoutEntry = entry.value;
          return TableRow(
            children: [
              Padding(
                padding: EdgeInsets.all(8.0),
                child: TextField(
                  controller: TextEditingController.fromValue(
                    TextEditingValue(
                      text: workoutEntry.exercise ?? '',
                      selection: TextSelection.collapsed(
                        offset: workoutEntry.exercise?.length ?? 0,
                      ),
                    ),
                  ),
                  decoration: InputDecoration(labelText: 'Exercise'),
                  onChanged: (value) {
                    workoutEntry.exercise = value;
                    onChanged();
                  },
                  textAlign: TextAlign.start,
                ),
              ),
              Padding(
                padding: EdgeInsets.all(8.0),
                child: TextField(
                  controller: TextEditingController.fromValue(
                    TextEditingValue(
                      text: workoutEntry.sets?.toString() ?? '',
                      selection: TextSelection.collapsed(
                        offset: workoutEntry.sets?.toString().length ?? 0,
                      ),
                    ),
                  ),
                  decoration: InputDecoration(labelText: 'Sets'),
                  keyboardType: TextInputType.number,
                  onChanged: (value) {
                    if (int.tryParse(value) != null) {
                      workoutEntry.sets = int.parse(value);
                      onChanged();
                    }
                  },
                  textAlign: TextAlign.start,
                ),
              ),
              Padding(
                padding: EdgeInsets.all(8.0),
                child: TextField(
                  controller: TextEditingController.fromValue(
                    TextEditingValue(
                      text: workoutEntry.reps?.toString() ?? '',
                      selection: TextSelection.collapsed(
                        offset: workoutEntry.reps?.toString().length ?? 0,
                      ),
                    ),
                  ),
                  decoration: InputDecoration(labelText: 'Reps'),
                  keyboardType: TextInputType.number,
                  onChanged: (value) {
                    if (int.tryParse(value) != null) {
                      workoutEntry.reps = int.parse(value);
                      onChanged();
                    }
                  },
                  textAlign: TextAlign.start,
                ),
              ),
              Padding(
                padding: EdgeInsets.all(8.0),
                child: TextField(
                  controller: TextEditingController.fromValue(
                    TextEditingValue(
                      text: workoutEntry.weight?.toString() ?? '',
                      selection: TextSelection.collapsed(
                        offset: workoutEntry.weight?.toString().length ?? 0,
                      ),
                    ),
                  ),
                  decoration: InputDecoration(labelText: 'Weight (kg)'),
                  keyboardType: TextInputType.number,
                  onChanged: (value) {
                    if (double.tryParse(value) != null) {
                      workoutEntry.weight = double.parse(value);
                      onChanged();
                    }
                  },
                  textAlign: TextAlign.start,
                ),
              ),
              IconButton(
                icon: Icon(Icons.delete, color: Colors.red),
                onPressed: () => onDelete(index),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }
}
