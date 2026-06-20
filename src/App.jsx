import { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { Camera, Image as ImageIcon, Sparkles, X, Aperture, Trash2 } from 'lucide-react';

function App() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  // State array to store captured photo strings (Base64 data URLs)
  const [photos, setPhotos] = useState([]);
  const webcamRef = useRef(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  // Function to capture the current webcam frame
  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Add the new photo to the front of our photos array
        setPhotos((prevPhotos) => [imageSrc, ...prevPhotos]);
      }
    }
  };

  // Function to delete a specific photo from the grid
  const deletePhoto = (indexToDelete) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, index) => index !== indexToDelete));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 text-center border border-slate-700">
        
        {/* Camera Feed OR Dashboard Icon */}
        {isCameraOn ? (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-6 border border-slate-600 shadow-inner">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
            <button 
              onClick={() => setIsCameraOn(false)}
              className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-400 rounded-full mb-6 ring-4 ring-indigo-600/10">
            <Camera size={40} />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          Photobooth Web
        </h1>
        
        <p className="text-slate-400 text-sm mb-8">
          {isCameraOn ? "Smile for the camera!" : "Your modern React + Vite + Tailwind setup is running flawlessly!"}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isCameraOn ? (
            <button 
              onClick={capturePhoto}
              className="w-full bg-emerald-600 hover:bg-emerald-500 font-semibold py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Aperture size={18} /> Capture Photo
            </button>
          ) : (
            <button 
              onClick={() => setIsCameraOn(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Camera size={18} /> Open Camera
            </button>
          )}
        </div>

        {/* Dynamic Photo Gallery Grid */}
        {photos.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-700 text-left">
            <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-4">
              <ImageIcon size={16} /> Your Snapshots ({photos.length})
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photoSrc, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden group border border-slate-600">
                  <img src={photoSrc} alt={`Capture ${index}`} className="w-full h-full object-cover" />
                  {/* Delete Button Hover Overlay */}
                  <button 
                    onClick={() => deletePhoto(index)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Tag */}
        <div className="mt-8 inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full font-medium">
          <Sparkles size={12} /> Capture Feature Active
        </div>

      </div>
    </div>
  );
}

export default App;
