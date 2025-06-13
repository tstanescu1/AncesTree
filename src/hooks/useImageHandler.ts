import { Alert } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

export interface ImageResult {
    base64: string;
    compressedUri: string;
    location?: {
        latitude: number;
        longitude: number;
        timestamp?: number;
    };
}

export const useImageHandler = () => {
    // Extract GPS coordinates from image EXIF data
    const extractLocationFromImage = async (uri: string): Promise<{ latitude: number; longitude: number; timestamp?: number } | null> => {
        try {
            // Get asset info including EXIF data
            const asset = await MediaLibrary.getAssetInfoAsync(uri);
            
            if (asset.exif) {
                // Type assertion for EXIF data since the types aren't complete
                const exifData = asset.exif as any;
                const { GPS, DateTime } = exifData;
                
                if (GPS && GPS.GPSLatitude && GPS.GPSLongitude) {
                    // Convert GPS coordinates from DMS to decimal degrees
                    const latitude = convertDMSToDD(
                        GPS.GPSLatitude,
                        GPS.GPSLatitudeRef
                    );
                    const longitude = convertDMSToDD(
                        GPS.GPSLongitude,
                        GPS.GPSLongitudeRef
                    );
                    
                    let timestamp;
                    if (DateTime) {
                        timestamp = new Date(DateTime).getTime();
                    }
                    
                    console.log(`📍 Found GPS coordinates in image: ${latitude}, ${longitude}`);
                    return { latitude, longitude, timestamp };
                }
            }
            
            return null;
        } catch (error) {
            console.log('Could not extract GPS data from image:', error);
            return null;
        }
    };

    // Convert DMS (Degrees Minutes Seconds) to Decimal Degrees
    const convertDMSToDD = (dms: number[], ref: string): number => {
        let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
        if (ref === 'S' || ref === 'W') {
            dd = dd * -1;
        }
        return dd;
    };

    // Compress image to fit Convex 1MB limit while preserving aspect ratio
    const compressImage = async (uri: string): Promise<ImageResult> => {
        console.log("Compressing image...");
        
        // First, try to extract GPS coordinates from the original image
        let locationData = null;
        try {
            locationData = await extractLocationFromImage(uri);
            if (locationData) {
                Alert.alert(
                    "📍 Location Found!",
                    `GPS coordinates found in photo:\n${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}\n\nThis will be used as the plant location.`,
                    [{ text: "OK" }]
                );
            }
        } catch (error) {
            console.log('EXIF extraction failed:', error);
        }
        
        // Preserve original aspect ratio - no forced cropping
        const resized = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }], // Let height scale naturally to preserve aspect ratio
            { 
                compress: 0.4, // Good compression while maintaining quality
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true 
            }
        );
        
        if (!resized.base64) throw new Error("Failed to compress image");
        
        // Check if still too large (base64 is ~33% larger than actual file)
        const sizeInMB = (resized.base64.length * 0.75) / (1024 * 1024);
        console.log(`Compressed image size: ${sizeInMB.toFixed(2)} MB`);
        
        if (sizeInMB > 0.8) { // Leave some buffer under 1MB
            console.log("Still too large, compressing further...");
            const furtherCompressed = await ImageManipulator.manipulateAsync(
                resized.uri,
                [{ resize: { width: 600 } }], // Smaller but preserve aspect ratio
                { 
                    compress: 0.3, // More compression
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true 
                }
            );
            if (!furtherCompressed.base64) throw new Error("Failed to compress image further");
            return { 
                base64: furtherCompressed.base64, 
                compressedUri: furtherCompressed.uri,
                location: locationData || undefined
            };
        }
        
        return { 
            base64: resized.base64, 
            compressedUri: resized.uri,
            location: locationData || undefined
        };
    }

    const requestPermissions = async () => {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraPermission.status !== 'granted' && mediaPermission.status !== 'granted') {
            Alert.alert(
                "Permissions Required",
                "Camera and photo library access is needed to identify plants. Please enable permissions in Settings.",
                [{ text: "OK" }]
            );
            return { camera: false, media: false };
        }
        
        return {
            camera: cameraPermission.status === 'granted',
            media: mediaPermission.status === 'granted'
        };
    };

    const launchCamera = async () => {
        try {
            return await ImagePicker.launchCameraAsync({ 
                base64: false,
                quality: 0.8, // Higher quality
                allowsEditing: true, // Allow user to crop to focus on plant (free aspect)
                allowsMultipleSelection: false,
                exif: true, // Include EXIF data
            });
        } catch (error) {
            console.log("Camera not available:", error);
            return null;
        }
    };

    const launchImageLibrary = async () => {
        try {
            return await ImagePicker.launchImageLibraryAsync({ 
                base64: false,
                quality: 0.8,
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                allowsMultipleSelection: false,
                exif: true, // Include EXIF data
            });
        } catch (error) {
            console.log("Image library error:", error);
            return null;
        }
    };

    const showImageSourceAlert = (onCameraSelect: () => void, onLibrarySelect: () => void) => {
        Alert.alert(
            "Select Image Source",
            "Choose where to get your plant photo from:",
            [
                { text: "Cancel", style: "cancel" },
                { text: "📷 Camera", onPress: onCameraSelect },
                { text: "📚 Photo Library", onPress: onLibrarySelect },
            ]
        );
    };

    return {
        compressImage,
        requestPermissions,
        launchCamera,
        launchImageLibrary,
        showImageSourceAlert,
        extractLocationFromImage
    };
}; 