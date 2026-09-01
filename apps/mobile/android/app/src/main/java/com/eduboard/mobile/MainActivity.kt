package com.eduboard.mobile

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.*
import android.widget.EditText
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

import android.app.DownloadManager
import android.content.Context
import android.os.Environment
import android.webkit.URLUtil

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingPermissionRequest: PermissionRequest? = null
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    // Default host URL for local Wi-Fi network (http://10.101.120.243:3000) & ADB reverse / localhost fallback (http://localhost:3000)
    private var currentHostUrl = "http://10.101.120.243:3000"
    private var wifiFallbackUrl = "http://localhost:3000"
    private var isFallbackAttempted = false

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (fileUploadCallback == null) return@registerForActivityResult
        val results: Array<Uri>? = if (result.resultCode == RESULT_OK) {
            result.data?.let { intent ->
                intent.data?.let { arrayOf(it) }
                    ?: intent.clipData?.let { clip ->
                        Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                    }
            }
        } else null
        fileUploadCallback?.onReceiveValue(results)
        fileUploadCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize WebView programmatically
        webView = WebView(this)
        setContentView(webView)

        setupWebViewSettings()
        setupWebChromeClient()
        setupWebViewClient()
        setupDownloadListener()
        setupBackNavigation()

        checkAndRequestAndroidPermissions()

        // Load Next.js web application
        loadWebApp(currentHostUrl)
    }

    private fun setupWebViewSettings() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.setSupportMultipleWindows(true)
        settings.javaScriptCanOpenWindowsAutomatically = true

        // Viewport & Responsive layout scaling for mobile screens
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

        // Unrestricted HTML5 Audio/Video autoplay (crucial for MediaPipe & Voice Board prompts)
        settings.mediaPlaybackRequiresUserGesture = false

        // Enable HTML5 Geolocation API
        settings.setGeolocationEnabled(true)

        // Enable Hardware Acceleration & High Performance Canvas Drawing
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null)

        // Allow mixed content for local HTTP development server
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Custom User Agent string so Google Sign-In / OAuth works seamlessly without 'disallowed_useragent' error
        val defaultUserAgent = settings.userAgentString
        val customUserAgent = defaultUserAgent.replace("; wv", "")
        settings.userAgentString = customUserAgent
    }

    private fun setupWebChromeClient() {
        webView.webChromeClient = object : WebChromeClient() {

            // Crucial: Automatically grant Web Camera & Microphone permissions for MediaPipe Gestures & Voice Board
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return

                val requestedResources = request.resources
                var needsCamera = false
                var needsAudio = false

                for (res in requestedResources) {
                    if (res == PermissionRequest.RESOURCE_AUDIO_CAPTURE) needsAudio = true
                    if (res == PermissionRequest.RESOURCE_VIDEO_CAPTURE) needsCamera = true
                }

                val hasCamera = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                val hasAudio = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

                if ((needsCamera && !hasCamera) || (needsAudio && !hasAudio)) {
                    pendingPermissionRequest = request
                    val permissionsToRequest = mutableListOf<String>()
                    if (needsCamera && !hasCamera) permissionsToRequest.add(Manifest.permission.CAMERA)
                    if (needsAudio && !hasAudio) permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
                    ActivityCompat.requestPermissions(this@MainActivity, permissionsToRequest.toTypedArray(), PERMISSION_REQUEST_CODE)
                } else {
                    runOnUiThread {
                        request.grant(request.resources)
                    }
                }
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest?) {
                pendingPermissionRequest = null
            }

            // Support File Picker for uploading documents & images in Web App
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    filePickerLauncher.launch(intent)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }

            // Grant Geolocation permissions if requested by Web App
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }

            // Support Google Auth & Popup Windows inside WebView
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?
            ): Boolean {
                val newWebView = WebView(this@MainActivity)
                newWebView.settings.javaScriptEnabled = true
                newWebView.settings.domStorageEnabled = true
                newWebView.settings.userAgentString = view?.settings?.userAgentString

                newWebView.webChromeClient = this
                newWebView.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                        val url = request?.url?.toString() ?: return false
                        if (url.contains("accounts.google.com") || url.contains("firebaseapp.com")) {
                            webView.loadUrl(url)
                            return true
                        }
                        return false
                    }
                }

                val transport = resultMsg?.obj as? WebView.WebViewTransport
                transport?.webView = newWebView
                resultMsg?.sendToTarget()
                return true
            }
        }
    }

    private fun setupDownloadListener() {
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            try {
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimetype)
                    addRequestHeader("User-Agent", userAgent)
                    setDescription("Downloading file from EduBoard...")
                    val fileName = URLUtil.guessFileName(url, contentDisposition, mimetype)
                    setTitle(fileName)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                }
                val downloadManager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                downloadManager.enqueue(request)
                Toast.makeText(applicationContext, "Downloading file to Downloads folder...", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(applicationContext, "Download failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun setupWebViewClient() {
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false

                // Keep app navigation inside WebView
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false
                }
                // Handle external protocols (e.g. mailto:, tel:)
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                } catch (e: Exception) {
                    return false
                }
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                if (failingUrl == currentHostUrl || failingUrl == "$currentHostUrl/") {
                    if (!isFallbackAttempted && currentHostUrl != wifiFallbackUrl) {
                        isFallbackAttempted = true
                        loadWebApp(wifiFallbackUrl)
                    } else {
                        showIpConfigDialog("Could not connect to EduBoard web server at: $failingUrl\nError: $description")
                    }
                }
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    private fun loadWebApp(url: String) {
        val formattedUrl = if (url.endsWith("/")) url else "$url/"
        currentHostUrl = url
        webView.loadUrl(formattedUrl)
    }

    private fun checkAndRequestAndroidPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.MODIFY_AUDIO_SETTINGS,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missingPermissions.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            pendingPermissionRequest?.let { request ->
                val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
                if (allGranted) {
                    runOnUiThread { request.grant(request.resources) }
                } else {
                    runOnUiThread { request.deny() }
                }
                pendingPermissionRequest = null
            }
            // Auto reload web page once permissions are accepted/dismissed
            runOnUiThread {
                loadWebApp(currentHostUrl)
            }
        }
    }

    private fun showIpConfigDialog(message: String) {
        val input = EditText(this).apply {
            setText(currentHostUrl)
            hint = "http://192.168.x.x:3000"
        }
        AlertDialog.Builder(this)
            .setTitle("EduBoard Laptop IP Connection")
            .setMessage(message + "\n\nEnter your laptop's Local IP address:")
            .setView(input)
            .setPositiveButton("Connect") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotBlank()) {
                    loadWebApp(newUrl)
                }
            }
            .setNegativeButton("Retry") { _, _ ->
                loadWebApp(currentHostUrl)
            }
            .show()
    }

    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
    }
}
