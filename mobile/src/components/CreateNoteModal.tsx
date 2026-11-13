import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Venue } from '../types/models';

interface Props {
  visible: boolean;
  venues: Venue[];
  onClose: () => void;
  onSubmitPost: (payload: {
    title: string;
    body: string;
    primary_venue_id?: string;
    location_label: string;
    dish_name: string;
    dish_price_mnt: number;
    hashtags: string[];
  }) => Promise<void>;
}

export const CreateNoteModal: React.FC<Props> = React.memo(
  ({ visible, venues, onClose, onSubmitPost }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [selectedVenueId, setSelectedVenueId] = useState<string>(venues[0]?.id || '');
    const [dishName, setDishName] = useState('');
    const [dishPrice, setDishPrice] = useState('32000');
    const [hashtagsInput, setHashtagsInput] = useState('UlaanbaatarEats, UBFoodGuide');
    const [submitting, setSubmitting] = useState(false);

    const selectedVenue = venues.find((v) => v.id === selectedVenueId);

    const handlePublish = async () => {
      if (title.trim().length < 3 || body.trim().length < 5) return;
      setSubmitting(true);
      try {
        const tags = hashtagsInput
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);

        await onSubmitPost({
          title: title.trim(),
          body: body.trim(),
          primary_venue_id: selectedVenue?.id,
          location_label: selectedVenue
            ? `${selectedVenue.sub_district}${selectedVenue.floor_level ? `, ${selectedVenue.floor_level}` : ''}`
            : 'Downtown Ulaanbaatar',
          dish_name:
            dishName.trim() || selectedVenue?.signature_dishes[0] || 'House Signature Dish',
          dish_price_mnt: Number(dishPrice.replace(/[^0-9]/g, '')) || 32000,
          hashtags: tags.length > 0 ? tags : ['UlaanbaatarEats'],
        });
        setTitle('');
        setBody('');
        setDishName('');
        onClose();
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Food Moment (Note)</Text>
            <TouchableOpacity
              onPress={handlePublish}
              disabled={submitting || title.trim().length < 3}
              style={[
                styles.publishBtn,
                (submitting || title.trim().length < 3) && { opacity: 0.45 },
              ]}
            >
              <Text style={styles.publishText}>{submitting ? 'Posting...' : 'Publish'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Headline</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Late-night lamb hotpot after Sukhbaatar Square walk"
            />

            <Text style={styles.label}>Link to Ulaanbaatar Restaurant POI</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.venueScroll}
            >
              {venues.map((v) => {
                const active = v.id === selectedVenueId;
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => {
                      setSelectedVenueId(v.id);
                      if (!dishName && v.signature_dishes[0]) {
                        setDishName(v.signature_dishes[0]);
                      }
                    }}
                    style={[styles.venueChip, active && styles.venueChipActive]}
                  >
                    <Text style={[styles.venueChipText, active && styles.venueChipTextActive]}>
                      📍 {v.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.row}>
              <View style={{ flex: 2, marginRight: 8 }}>
                <Text style={styles.label}>Tagged Dish Name</Text>
                <TextInput
                  style={styles.input}
                  value={dishName}
                  onChangeText={setDishName}
                  placeholder={selectedVenue?.signature_dishes[0] || 'Prime Sliced Lamb'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Dish Price (₮)</Text>
                <TextInput
                  style={styles.input}
                  value={dishPrice}
                  onChangeText={setDishPrice}
                  keyboardType="numeric"
                  placeholder="32000"
                />
              </View>
            </View>

            <Text style={styles.label}>Your Story & Ordering Tips</Text>
            <TextInput
              style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
              multiline
              value={body}
              onChangeText={setBody}
              placeholder="What makes this spot worth visiting? Any secret sauces, best seating, or must-order items?"
            />

            <Text style={styles.label}>Hashtags (comma-separated)</Text>
            <TextInput
              style={styles.input}
              value={hashtagsInput}
              onChangeText={setHashtagsInput}
              placeholder="UlaanbaatarEats, UBHotpot, Sukhbaatar"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  cancelText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  publishBtn: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  publishText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  content: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  venueScroll: { flexDirection: 'row', marginVertical: 4 },
  venueChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
  },
  venueChipActive: { backgroundColor: '#FFE4E6', borderWidth: 1, borderColor: '#E11D48' },
  venueChipText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  venueChipTextActive: { color: '#E11D48', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
