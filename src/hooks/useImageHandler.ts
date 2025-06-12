import { Alert } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';

export const useImageHandler = () => {
    // Compress image to fit Convex 1MB limit while respecting crop
    const compressImage = async (uri: string): Promise<{ base64: string; compressedUri: string }> => {
        console.log("Compressing cropped image...");
        
        // Preserve aspect ratio while compressing (user already cropped to square in picker)
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
                compressedUri: furtherCompressed.uri 
            };
        }
        
        return { 
            base64: resized.base64, 
            compressedUri: resized.uri 
        };
    };

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
                quality: 0.7,
                allowsEditing: true,
                aspect: [1, 1], // Square crop for consistent plant focus
                allowsMultipleSelection: false,
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
                quality: 0.7,
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                allowsMultipleSelection: false,
            });
        } catch (error) {
            console.log("Image library error:", error);
            return null;
        }
    };

    const showImageSourceAlert = (onLibrarySelect: () => void) => {
        Alert.alert(
            "Choose Photo Source",
            "Camera not available. Would you like to select a photo from your library?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Photo Library", 
                    onPress: onLibrarySelect
                }
            ]
        );
    };

    return {
        compressImage,
        requestPermissions,
        launchCamera,
        launchImageLibrary,
        showImageSourceAlert
    };
}; 