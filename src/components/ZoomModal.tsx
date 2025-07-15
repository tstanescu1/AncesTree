import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Dimensions, PanGestureHandler, State } from 'react-native';
import { PanGestureHandler as RNGHPanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ZoomModalProps {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
}

export default function ZoomModal({ visible, imageUri, onClose }: ZoomModalProps) {
    const [scale, setScale] = useState(1);
    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);

    // Reset all transforms when modal opens or image changes
    useEffect(() => {
        if (visible && imageUri) {
            setScale(1);
            setTranslateX(0);
            setTranslateY(0);
        }
    }, [visible, imageUri]);

    const handleClose = () => {
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);
        onClose();
    };

    const onPinchGestureEvent = (event: any) => {
        const newScale = Math.max(1, Math.min(5, event.nativeEvent.scale));
        setScale(newScale);
    };

    const onPanGestureEvent = (event: any) => {
        if (scale > 1) {
            setTranslateX(event.nativeEvent.translationX);
            setTranslateY(event.nativeEvent.translationY);
        }
    };

    if (!visible || !imageUri) {
        return null;
    }

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ 
                flex: 1, 
                backgroundColor: 'rgba(0,0,0,0.95)',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                {/* Header with close button */}
                <View style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    paddingTop: 50, 
                    paddingHorizontal: 20,
                    paddingBottom: 10,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: 1000
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                            🔍 Zoom: {scale.toFixed(1)}x
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
                
                {/* Image with custom zoom */}
                <PinchGestureHandler onGestureEvent={onPinchGestureEvent}>
                    <RNGHPanGestureHandler onGestureEvent={onPanGestureEvent}>
                        <View style={{
                            transform: [
                                { scale },
                                { translateX },
                                { translateY }
                            ],
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
                                source={{ 
                                    uri: imageUri.startsWith('data:') || imageUri.startsWith('http') 
                                        ? imageUri 
                                        : `data:image/jpeg;base64,${imageUri}` 
                                }} 
                                style={{ 
                                    width: screenWidth * 0.9, 
                                    height: screenHeight * 0.6,
                                    resizeMode: 'contain',
                                    borderRadius: 8,
                                    backgroundColor: '#ffffff'
                                }} 
                            />
                        </View>
                    </RNGHPanGestureHandler>
                </PinchGestureHandler>
                
                {/* Footer */}
                <View style={{ 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    paddingHorizontal: 20, 
                    paddingVertical: 15,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <Text style={{ 
                        color: 'white', 
                        fontSize: 14,
                        textAlign: 'center',
                        marginBottom: 4
                    }}>
                        📱 Pinch to zoom • Drag to pan
                    </Text>
                </View>
            </View>
        </Modal>
    );
} 