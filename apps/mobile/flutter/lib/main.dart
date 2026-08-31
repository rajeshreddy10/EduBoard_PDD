import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:permission_handler/permission_handler.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Request camera, microphone, and location permissions for MediaPipe & Voice board
  await [
    Permission.camera,
    Permission.microphone,
    Permission.storage,
    Permission.location,
  ].request();

  runApp(const EduBoardFlutterApp());
}

class EduBoardFlutterApp extends StatelessWidget {
  const EduBoardFlutterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EduBoard Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const EduBoardWebContainer(),
    );
  }
}

class EduBoardWebContainer extends StatefulWidget {
  const EduBoardWebContainer({super.key});

  @override
  State<EduBoardWebContainer> createState() => _EduBoardWebContainerState();
}

class _EduBoardWebContainerState extends State<EduBoardWebContainer> {
  late final WebViewController _controller;
  String currentUrl = "http://10.101.120.243:3000";
  final String fallbackUrl = "http://localhost:3000";
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0F172A))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              isLoading = true;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            if (currentUrl != fallbackUrl) {
              setState(() {
                currentUrl = fallbackUrl;
              });
              _controller.loadRequest(Uri.parse(fallbackUrl));
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(currentUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (isLoading)
              const LinearProgressIndicator(
                backgroundColor: Color(0xFF1E293B),
                color: Color(0xFF6366F1),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.small(
        backgroundColor: const Color(0xFF4F46E5),
        tooltip: 'Refresh / Connect IP',
        onPressed: () {
          _showIpDialog(context);
        },
        child: const Icon(Icons.refresh, color: Colors.white),
      ),
    );
  }

  void _showIpDialog(BuildContext context) {
    final TextEditingController ipController = TextEditingController(text: currentUrl);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('EduBoard Connection IP'),
        content: TextField(
          controller: ipController,
          decoration: const InputDecoration(
            hintText: 'http://192.168.x.x:3000',
            labelText: 'Server URL',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final newUrl = ipController.text.trim();
              if (newUrl.isNotEmpty) {
                setState(() {
                  currentUrl = newUrl;
                });
                _controller.loadRequest(Uri.parse(newUrl));
              }
              Navigator.pop(context);
            },
            child: const Text('Connect'),
          ),
        ],
      ),
    );
  }
}
