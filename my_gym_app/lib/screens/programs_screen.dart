import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'program_entries_screen.dart';

class ProgramsScreen extends StatefulWidget {
  @override
  _ProgramsScreenState createState() => _ProgramsScreenState();
}

class _ProgramsScreenState extends State<ProgramsScreen> {
  @override
  Widget build(BuildContext context) {
    User? user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Text('Programs'),
        actions: [
          Padding(
            padding:
                const EdgeInsets.only(right: 32.0), // Shift the button left
            child: IconButton(
              icon: Icon(Icons.add, color: Colors.white),
              onPressed: () {
                _showProgramOptions(context);
              },
            ),
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('users')
            .doc(user?.uid)
            .collection('programs')
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error loading programs'));
          }
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(child: Text('No programs found'));
          }

          final programs = snapshot.data!.docs;

          return ListView.builder(
            itemCount: programs.length,
            itemBuilder: (context, index) {
              var program = programs[index];
              return ListTile(
                title: Text(program.id),
                trailing: IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () {
                    _deleteProgram(program.id);
                  },
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ProgramEntriesScreen(
                        userId: user!.uid,
                        programId: program.id,
                      ),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }

  void _showProgramOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return ListView(
          children: [
            ListTile(
              title: Text('PPL (Push Pull Legs)'),
              onTap: () {
                _createProgram('PPL');
                Navigator.pop(context);
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _createProgram(String programName) async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    await FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('programs')
        .doc(programName)
        .set({
      'userId': user.uid,
    });

    await FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('programs')
        .doc(programName)
        .collection('entries')
        .doc('Legs')
        .set({
      'entryName': 'Legs',
      'exercises': [],
    });

    await FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('programs')
        .doc(programName)
        .collection('entries')
        .doc('Pull')
        .set({
      'entryName': 'Pull',
      'exercises': [],
    });

    await FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('programs')
        .doc(programName)
        .collection('entries')
        .doc('Push')
        .set({
      'entryName': 'Push',
      'exercises': [],
    });
  }

  Future<void> _deleteProgram(String programId) async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    await FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('programs')
        .doc(programId)
        .delete();
  }
}
