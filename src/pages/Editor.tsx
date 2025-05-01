import { useState, useEffect } from "react";
import { Upload, Crop, RotateCw, Move, Sun, Contrast, Palette, Filter, Text, Square, FlipHorizontal } from "lucide-react";

// Define types
interface Image {
  filename: string;
  path: string;
  preview_path: string | null;
  size: number;
  modified: number;
}

interface ApiResponse {
  status: string;
  message?: string;
  data?: {
    images?: Image[];
    filename?: string;
  };
}

const Editor = () => {
  // State variables
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Parameters for image operations
  const [cropParams, setCropParams] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [rotateAngle, setRotateAngle] = useState(90);
  const [resizeParams, setResizeParams] = useState({ width: 800, height: 600, maintain_aspect: true });
  const [flipDirection, setFlipDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [brightnessFactor, setBrightnessFactor] = useState(1.2);
  const [contrastFactor, setContrastFactor] = useState(1.2);
  const [saturationFactor, setSaturationFactor] = useState(1.2);
  const [selectedFilter, setSelectedFilter] = useState<string>("grayscale");
  const [textParams, setTextParams] = useState({ text: "Sample Text", position_x: 50, position_y: 50, font_size: 24, color: "white" });
  const [borderParams, setBorderParams] = useState({ width: 10, color: "black" });

  const baseUrl = "http://127.0.0.1:5000/api";

  // Fetch images when component mounts
  useEffect(() => {
    fetchImages();
  }, []);

  // Display message for 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch images from API
  const fetchImages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/list`);
      const result = await response.json();

      if (result.status === "success") {
        setImages(result.data.images);
      } else {
        setMessage({ text: result.message || "Failed to fetch images", type: "error" });
      }
    } catch {
      setMessage({ text: "Error connecting to server", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === "success") {
        setMessage({ text: "Image uploaded successfully", type: "success" });
        await fetchImages();
        // Find the newly uploaded image and select it
        const uploadedImage = result.data;
        setSelectedImage(images.find((img) => img.filename === uploadedImage.filename) || null);
        setActiveTab("basic");
      } else {
        setMessage({ text: result.message || "Failed to upload image", type: "error" });
      }
    } catch {
      setMessage({ text: "Error uploading image", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image selection
  const handleSelectImage = (image: Image) => {
    setSelectedImage(image);
    if (activeTab === "upload") {
      setActiveTab("basic");
    }
  };

  // Delete an image
  const handleDeleteImage = async (filename: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/delete/${filename}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.status === "success") {
        setMessage({ text: "Image deleted successfully", type: "success" });

        // If deleted image was selected, clear selection
        if (selectedImage && selectedImage.filename === filename) {
          setSelectedImage(null);
        }

        await fetchImages();
      } else {
        setMessage({ text: result.message || "Failed to delete image", type: "error" });
      }
    } catch {
      setMessage({ text: "Error deleting image", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Process the image
  const processImage = async (endpoint: string, params: Record<string, unknown>) => {
    if (!selectedImage) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedImage.filename,
          ...params,
        }),
      });

      const result: ApiResponse = await response.json();

      if (result.status === "success") {
        setMessage({ text: result.message || "Image processed successfully", type: "success" });
        await fetchImages();

        // Select the processed image
        const processedFilename = result.data?.filename;
        if (processedFilename) {
          const processedImage = images.find((img) => img.filename === processedFilename);
          if (processedImage) {
            setSelectedImage(processedImage);
          }
        }
      } else {
        setMessage({ text: result.message || "Failed to process image", type: "error" });
      }
    } catch {
      setMessage({ text: "Error processing image", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Operation handlers
  const handleCrop = () => processImage("crop", cropParams);
  const handleRotate = () => processImage("rotate", { angle: rotateAngle });
  const handleResize = () => processImage("resize", resizeParams);
  const handleFlip = () => processImage("flip", { direction: flipDirection });
  const handleBrightness = () => processImage("brightness", { factor: brightnessFactor });
  const handleContrast = () => processImage("contrast", { factor: contrastFactor });
  const handleSaturation = () => processImage("saturation", { factor: saturationFactor });
  const handleFilter = () => processImage("filter", { filter_type: selectedFilter });
  const handleAddText = () => processImage("text", textParams);
  const handleAddBorder = () => processImage("border", borderParams);

  // Render tabs content
  const renderTabContent = () => {
    switch (activeTab) {
      case "upload":
        return (
          <div className="p-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input type="file" id="file-upload" accept=".jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleUpload} />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                <Upload className="w-12 h-12 text-blue-500" />
                <span className="text-lg font-medium">Click to upload an image</span>
                <span className="text-sm text-gray-500">PNG, JPG, JPEG, GIF, WEBP up to 16MB</span>
              </label>
            </div>
          </div>
        );
      case "basic":
        return (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Crop className="w-5 h-5" />
                Crop
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">X Position</label>
                  <input type="number" value={cropParams.x} onChange={(e) => setCropParams({ ...cropParams, x: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Y Position</label>
                  <input type="number" value={cropParams.y} onChange={(e) => setCropParams({ ...cropParams, y: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Width</label>
                  <input type="number" value={cropParams.width} onChange={(e) => setCropParams({ ...cropParams, width: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Height</label>
                  <input type="number" value={cropParams.height} onChange={(e) => setCropParams({ ...cropParams, height: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
              </div>
              <button onClick={handleCrop} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Crop
              </button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <RotateCw className="w-5 h-5" />
                Rotate
              </h3>
              <div>
                <label className="block text-sm mb-1">Angle (degrees)</label>
                <input type="number" value={rotateAngle} onChange={(e) => setRotateAngle(parseInt(e.target.value))} className="w-full p-2 border rounded" />
              </div>
              <button onClick={handleRotate} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Rotation
              </button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Move className="w-5 h-5" />
                Resize
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">Width</label>
                  <input type="number" value={resizeParams.width} onChange={(e) => setResizeParams({ ...resizeParams, width: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Height</label>
                  <input type="number" value={resizeParams.height} onChange={(e) => setResizeParams({ ...resizeParams, height: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
              </div>
              <div className="mt-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={resizeParams.maintain_aspect} onChange={(e) => setResizeParams({ ...resizeParams, maintain_aspect: e.target.checked })} />
                  <span>Maintain aspect ratio</span>
                </label>
              </div>
              <button onClick={handleResize} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Resize
              </button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <FlipHorizontal className="w-5 h-5" />
                Flip
              </h3>
              <div className="mb-2">
                <label className="block text-sm mb-1">Direction</label>
                <select value={flipDirection} onChange={(e) => setFlipDirection(e.target.value as "horizontal" | "vertical")} className="w-full p-2 border rounded">
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
              <button onClick={handleFlip} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Flip
              </button>
            </div>
          </div>
        );
      case "color":
        return (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Sun className="w-5 h-5" />
                Brightness
              </h3>
              <div>
                <label className="block text-sm mb-1">Factor ({brightnessFactor})</label>
                <input type="range" min="0.1" max="2" step="0.1" value={brightnessFactor} onChange={(e) => setBrightnessFactor(parseFloat(e.target.value))} className="w-full" />
              </div>
              <button onClick={handleBrightness} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Brightness
              </button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Contrast className="w-5 h-5" />
                Contrast
              </h3>
              <div>
                <label className="block text-sm mb-1">Factor ({contrastFactor})</label>
                <input type="range" min="0.1" max="2" step="0.1" value={contrastFactor} onChange={(e) => setContrastFactor(parseFloat(e.target.value))} className="w-full" />
              </div>
              <button onClick={handleContrast} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Contrast
              </button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Saturation
              </h3>
              <div>
                <label className="block text-sm mb-1">Factor ({saturationFactor})</label>
                <input type="range" min="0.1" max="2" step="0.1" value={saturationFactor} onChange={(e) => setSaturationFactor(parseFloat(e.target.value))} className="w-full" />
              </div>
              <button onClick={handleSaturation} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Saturation
              </button>
            </div>
          </div>
        );
      case "filters":
        return (
          <div className="p-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Apply Filter
              </h3>
              <div>
                <label className="block text-sm mb-1">Filter Type</label>
                <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)} className="w-full p-2 border rounded">
                  <option value="blur">Blur</option>
                  <option value="contour">Contour</option>
                  <option value="detail">Detail</option>
                  <option value="edge_enhance">Edge Enhance</option>
                  <option value="emboss">Emboss</option>
                  <option value="sharpen">Sharpen</option>
                  <option value="smooth">Smooth</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="sepia">Sepia</option>
                  <option value="invert">Invert</option>
                  <option value="solarize">Solarize</option>
                  <option value="posterize">Posterize</option>
                  <option value="equalize">Equalize</option>
                </select>
              </div>
              <button onClick={handleFilter} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Apply Filter
              </button>
            </div>
          </div>
        );
      case "extras":
        return (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Text className="w-5 h-5" />
                Add Text
              </h3>
              <div className="mb-2">
                <label className="block text-sm mb-1">Text</label>
                <input type="text" value={textParams.text} onChange={(e) => setTextParams({ ...textParams, text: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">X Position</label>
                  <input type="number" value={textParams.position_x} onChange={(e) => setTextParams({ ...textParams, position_x: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Y Position</label>
                  <input type="number" value={textParams.position_y} onChange={(e) => setTextParams({ ...textParams, position_y: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Font Size</label>
                  <input type="number" value={textParams.font_size} onChange={(e) => setTextParams({ ...textParams, font_size: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Color</label>
                  <input type="color" value={textParams.color} onChange={(e) => setTextParams({ ...textParams, color: e.target.value })} className="w-full p-1 border rounded h-10" />
                </div>
              </div>
              <button onClick={handleAddText} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Add Text
              </button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Square className="w-5 h-5" />
                Add Border
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">Width (px)</label>
                  <input type="number" value={borderParams.width} onChange={(e) => setBorderParams({ ...borderParams, width: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Color</label>
                  <input type="color" value={borderParams.color} onChange={(e) => setBorderParams({ ...borderParams, color: e.target.value })} className="w-full p-1 border rounded h-10" />
                </div>
              </div>
              <button onClick={handleAddBorder} disabled={!selectedImage} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
                Add Border
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Image Processing App</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Message notifications */}
        {message && <div className={`mb-4 p-3 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{message.text}</div>}

        {/* Loading indicator */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-700">Processing...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar with uploaded images */}
          <div className="bg-white p-4 rounded-lg shadow md:col-span-1 h-min">
            <h2 className="text-lg font-medium mb-4">Uploaded Images</h2>

            {images.length === 0 ? (
              <p className="text-gray-500 text-sm">No images uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {images.map((image) => (
                  <div key={image.filename} onClick={() => handleSelectImage(image)} className={`cursor-pointer p-2 rounded-lg ${selectedImage?.filename === image.filename ? "bg-blue-100 border border-blue-300" : "hover:bg-gray-100"}`}>
                    <div className="relative">
                      <img src={image.preview_path || image.path} alt={image.filename} className="w-full h-32 object-contain rounded" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.filename);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                        title="Delete image"
                      >
                        ×
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 truncate" title={image.filename}>
                      {image.filename.substring(0, 20)}...
                    </p>
                    <p className="text-xs text-gray-500">{Math.round(image.size / 1024)} KB</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main content area */}
          <div className="bg-white rounded-lg shadow md:col-span-3">
            {/* Tabs */}
            <div className="border-b">
              <div className="flex overflow-x-auto">
                <button onClick={() => setActiveTab("upload")} className={`px-4 py-3 flex items-center gap-1 ${activeTab === "upload" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}>
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </button>
                <button onClick={() => setActiveTab("basic")} className={`px-4 py-3 flex items-center gap-1 ${activeTab === "basic" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`} disabled={!selectedImage}>
                  <Crop className="w-4 h-4" />
                  <span>Basic Operations</span>
                </button>
                <button onClick={() => setActiveTab("color")} className={`px-4 py-3 flex items-center gap-1 ${activeTab === "color" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`} disabled={!selectedImage}>
                  <Palette className="w-4 h-4" />
                  <span>Color Adjustments</span>
                </button>
                <button onClick={() => setActiveTab("filters")} className={`px-4 py-3 flex items-center gap-1 ${activeTab === "filters" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`} disabled={!selectedImage}>
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
                <button onClick={() => setActiveTab("extras")} className={`px-4 py-3 flex items-center gap-1 ${activeTab === "extras" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`} disabled={!selectedImage}>
                  <Text className="w-4 h-4" />
                  <span>Text & Border</span>
                </button>
              </div>
            </div>

            {/* Preview area - always visible when an image is selected */}
            {selectedImage && (
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium mb-2">Preview</h2>
                <div className="flex justify-center">
                  <img src={selectedImage.path} alt={selectedImage.filename} className="max-h-64 object-contain" />
                </div>
                <p className="mt-2 text-center text-sm text-gray-600">{selectedImage.filename}</p>
              </div>
            )}

            {/* Tab Content */}
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t py-4 shadow-md">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-600 text-sm">&copy; {new Date().getFullYear()} Image Processing App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Editor;
