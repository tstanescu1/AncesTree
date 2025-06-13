import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ZoomModalProps {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
}

export default function ZoomModal({ visible, imageUri, onClose }: ZoomModalProps) {
    const [zoomScale, setZoomScale] = useState(1);

    // Reset zoom when modal opens or image changes
    useEffect(() => {
        if (visible) {
            setZoomScale(1);
        }
    }, [visible, imageUri]);

    const handleClose = () => {
        setZoomScale(1);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ 
                flex: 1, 
                backgroundColor: 'rgba(0,0,0,0.95)' 
            }}>
                {/* Header with close button */}
                <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    paddingTop: 50, 
                    paddingHorizontal: 20,
                    paddingBottom: 10,
                    backgroundColor: 'rgba(0,0,0,0.8)'
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                            🔍 Zoom: {zoomScale.toFixed(1)}x
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={handleClose}
                        style={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)', 
                            borderRadius: 20, 
                            width: 40, 
                            height: 40, 
                            justifyContent: 'center', 
                            alignItems: 'center' 
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Zoomable ScrollView */}
                {imageUri && (
                    <ScrollView
                        key={imageUri}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ 
                            flexGrow: 1, 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            minHeight: screenHeight - 120,
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        maximumZoomScale={5}
                        minimumZoomScale={1}
                        bouncesZoom={true}
                        pinchGestureEnabled={true}
                        scrollEventThrottle={16}
                        onScroll={(event) => {
                            const { zoomScale } = event.nativeEvent;
                            setZoomScale(zoomScale);
                        }}
                        centerContent={true}
                        scrollEnabled={true}
                        directionalLockEnabled={false}
                    >
                        <View style={{
                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 4,
                            },
                            shadowOpacity: 0.5,
                            shadowRadius: 8,
                            elevation: 10,
                        }}>
                            <Image 
                                source={{ uri: imageUri }} 
                                style={{ 
                                    width: screenWidth * 0.9, 
                                    height: screenHeight * 0.6,
                                    resizeMode: 'contain',
                                    borderRadius: 8,
                                    backgroundColor: '#ffffff'
                                }} 
                            />
                        </View>
                    </ScrollView>
                )}
                
                {/* Simplified Footer */}
                <View style={{ 
                    paddingHorizontal: 20, 
                    paddingVertical: 15,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    alignItems: 'center'
                }}>
                    <Text style={{ 
                        color: 'white', 
                        fontSize: 14,
                        textAlign: 'center',
                        marginBottom: 4
                    }}>
                        📱 Pinch to zoom • Drag to pan • Double-tap to zoom in
                    </Text>
                    <Text style={{ 
                        color: '#9ca3af', 
                        fontSize: 12,
                        textAlign: 'center'
                    }}>
                        🖱️ Trackpad: Two-finger pinch/zoom • Works perfectly!
                    </Text>
                </View>
            </View>
        </Modal>
    );
} 