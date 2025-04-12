"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function UploadPage() {
  const [photo, setPhoto] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()
  const [cameraActive, setCameraActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Debug component lifecycle
  useEffect(() => {
    console.log("Upload component mounted")
    return () => {
      console.log("Upload component unmounted")
    }
  }, [])

  // Render the video element first, then start the camera
  useEffect(() => {
    // Wait for the next render cycle to ensure the video element is in the DOM
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Start camera only after initialization
  useEffect(() => {
    if (!isInitializing) {
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isInitializing])

  const startCamera = async () => {
    console.log("Starting camera...")

    // Double-check that the video element exists
    if (!videoRef.current) {
      console.error("Video element not available yet, waiting...")

      // Try again in a moment
      setTimeout(startCamera, 500)
      return
    }

    try {
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("MediaDevices API not supported in this browser")
        toast({
          title: "Camera Error",
          description: "Your browser doesn't support camera access. Please try a different browser.",
          variant: "destructive",
        })
        return
      }

      console.log("Requesting camera permission...")

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      console.log("Camera constraints:", constraints)

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log("Camera stream obtained:", stream.getVideoTracks().length > 0)

      if (stream.getVideoTracks().length === 0) {
        throw new Error("No video tracks found in the media stream")
      }

      // Double check video element is still available
      if (!videoRef.current) {
        console.error("Video element no longer available")
        throw new Error("Video element not found")
      }

      console.log("Setting video source...")
      videoRef.current.srcObject = stream

      // Add event listeners to handle video loading
      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded")
        if (videoRef.current) {
          videoRef.current
            .play()
            .then(() => {
              console.log("Video playing successfully")
              setCameraActive(true)
            })
            .catch((e) => {
              console.error("Error playing video:", e)
              throw e
            })
        }
      }

      videoRef.current.onerror = (e) => {
        console.error("Video element error:", e)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)

      // More specific error messages based on the error
      let errorMessage = "Could not access your camera. Please check permissions."

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMessage = "Camera access denied. Please allow camera access in your browser settings."
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorMessage = "No camera found on your device."
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMessage = "Camera is already in use by another application."
        } else if (err.name === "OverconstrainedError") {
          errorMessage = "Camera doesn't meet the required constraints."
        } else if (err.name === "SecurityError") {
          errorMessage = "Camera access blocked due to security restrictions."
        }
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      })

      // Add a fallback UI for when camera fails
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
        videoRef.current.srcObject = null
      } catch (err) {
        console.error("Error stopping camera:", err)
      }
      setCameraActive(false)
    }
  }

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw the current video frame to the canvas
      context?.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to data URL
      const photoData = canvas.toDataURL("image/jpeg")
      setPhoto(photoData)

      // Stop the camera after taking photo
      stopCamera()
    }
  }

  const resetPhoto = () => {
    setPhoto(null)
    startCamera()
  }

  const uploadPhoto = async () => {
    if (!photo) return

    setIsUploading(true)

    try {
      // Convert base64 to blob
      const response = await fetch(photo)
      const blob = await response.blob()

      // Create form data
      const formData = new FormData()
      formData.append("file", blob, "photo.jpg")

      // Upload to server
      const uploadResponse = await fetch("http://localhost:8080/api/photos/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload failed")
      }

      toast({
        title: "Upload Successful",
        description: "Your photo has been added to the event!",
      })

      // Reset for another photo
      setPhoto(null)
      startCamera()
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: "Could not upload your photo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Always render the video element, even if it's not visible yet
  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-6">Take a Photo</h1>

      <Card className="w-full max-w-md overflow-hidden">
        {/* Always render the video element, but hide it when not active */}
        <video ref={videoRef} autoPlay playsInline className={cameraActive && !photo ? "w-full h-auto" : "hidden"} />

        {cameraActive && !photo && (
          <div className="relative">
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <Button onClick={takePhoto} size="lg" className="rounded-full h-16 w-16 flex items-center justify-center">
                <span className="sr-only">Take Photo</span>
                <div className="h-12 w-12 rounded-full border-2 border-white"></div>
              </Button>
            </div>
          </div>
        )}

        {photo && (
          <div className="relative">
            <img src={photo || "/placeholder.svg"} alt="Preview" className="w-full h-auto" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button onClick={resetPhoto} size="icon" variant="secondary" className="rounded-full h-12 w-12">
                {/* Refresh icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                <span className="sr-only">Retake</span>
              </Button>
              <Button onClick={uploadPhoto} size="icon" className="rounded-full h-12 w-12" disabled={isUploading}>
                {/* Upload icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="sr-only">Upload</span>
              </Button>
            </div>
          </div>
        )}

        {!cameraActive && !photo && (
          <div className="flex flex-col justify-center items-center h-[400px] bg-muted p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-center text-sm text-muted-foreground">
              {isInitializing ? "Initializing camera..." : "Waiting for camera access..."}
            </p>
            {!isInitializing && (
              <Button onClick={startCamera} variant="outline" className="mt-4">
                Retry Camera Access
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Hidden canvas for processing the photo */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
