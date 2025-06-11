import React, { useState } from "react";
import { View, Text, Button, ActivityIndicator, Image, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";

export default function MainScreen() {
    const identify = useMutation(api.identifyPlant.identifyPlant);
    const [loading, setLoading] = useState(false);
    const [plant, setPlant] = useState<any>(null);

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
        if (result.canceled) return;

        setLoading(true);
        try {
            const photo = result.assets[0];
            if (!photo.base64) throw new Error("Failed to get image data");
            const res = await identify({ base64: photo.base64 });
            setPlant({ ...res, imageUri: photo.uri });
        } catch (err) {
            console.error("Error identifying plant:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-green-50 px-6 py-10 items-center">
            <Text className="text-3xl font-bold text-green-800 mb-6">🌿 AncesTree</Text>

            <Button title="📸 Identify a Plant" onPress={takePhoto} />

            {loading && <ActivityIndicator size="large" className="mt-6" />}

            {plant && (
                <View className="mt-8 p-4 bg-white rounded-xl shadow w-full max-w-md">
                    {plant.imageUri && (
                        <Image source={{ uri: plant.imageUri }} className="w-full h-48 rounded-lg mb-4" />
                    )}
                    <Text className="text-xl font-bold text-green-700">
                        {plant.commonNames?.[0] || plant.scientificName}
                    </Text>
                    <Text className="italic text-gray-600 mb-2">{plant.scientificName}</Text>
                    <Text className="font-semibold text-green-800">Medicinal Tags:</Text>
                    <Text className="text-sm text-gray-800">
                        {plant.tags.length > 0 ? plant.tags.join(", ") : "—"}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}
