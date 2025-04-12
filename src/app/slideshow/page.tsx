"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export default function SlideshowPage() {
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Interval in milliseconds between photos (default: 5 seconds)
  const interval = 5000

  const fetchNextPhoto = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8080/api/photos/next")
      console.log("Response:", response)
  
      // Verificar si la respuesta fue exitosa
      if (!response.ok) {
        throw new Error("Failed to fetch next photo")
      }
  
      // La respuesta es una imagen, así que no intentamos parsear JSON
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob) // Convertimos el blob en un URL
  
      // Establecemos la URL de la imagen
      setCurrentPhoto(imageUrl)
      setError(null)
  
    } catch (err) {
      console.error("Error fetching photo:", err)
      setError("Could not load the next photo")
    } finally {
      setLoading(false)
    }
  }
  

  useEffect(() => {
    // Fetch first photo immediately
    fetchNextPhoto()

    // Set up interval for subsequent photos
    const timer = setInterval(fetchNextPhoto, interval)

    // Clean up on unmount
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {loading && !currentPhoto && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <p className="text-xl">{error}</p>
        </div>
      )}

      {!currentPhoto && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <p className="text-xl">Waiting for photos...</p>
        </div>
      )}

      {currentPhoto && (
        <div className="w-full h-full flex items-center justify-center">
          {/* Using next/image with fill for optimal fullscreen display */}
          <div className="relative w-full h-full">
            <Image
              src={currentPhoto || "/placeholder.svg"}
              alt="Event photo"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
