import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton, Modal, Portal, Text } from 'react-native-paper';

interface ColorPickerModalProps {
    visible: boolean;
    onDismiss: () => void;
    onSelect: (color: string) => void;
    currentColor: string;
}

const COLORS = [
    // Reds/Pinks
    '#F44336', '#E91E63', '#FF4081', '#FFEB3B',
    // Purples
    '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
    // Cyans/Teals
    '#00BCD4', '#009688', '#4CAF50', '#8BC34A',
    // Greens/Limes
    '#CDDC39', '#FFC107', '#FF9800', '#FF5722',
    // Browns/Greys
    '#795548', '#9E9E9E', '#607D8B', '#000000'
];

export default function ColorPickerModal({ visible, onDismiss, onSelect, currentColor }: ColorPickerModalProps) {
    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Text style={styles.title}>Chọn màu sắc</Text>

                <ScrollView contentContainerStyle={styles.grid}>
                    {COLORS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorOption,
                                { backgroundColor: color },
                                currentColor === color && styles.selectedOption
                            ]}
                            onPress={() => {
                                onSelect(color);
                                onDismiss();
                            }}
                        >
                            {currentColor === color && (
                                <IconButton icon="check" iconColor="white" size={20} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 16,
        padding: 20,
        maxHeight: '70%',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    colorOption: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    selectedOption: {
        borderWidth: 3,
        borderColor: '#E0E0E0',
        transform: [{ scale: 1.1 }],
    },
});
