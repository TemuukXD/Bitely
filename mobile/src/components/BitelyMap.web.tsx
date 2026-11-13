import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Venue } from '../types/models';

export interface BitelyMapProps {
  venues: Venue[];
  activePinVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  mapRef?: React.RefObject<any>;
}

export const BitelyMap: React.FC<BitelyMapProps> = ({
  venues,
  activePinVenue,
  onSelectVenue,
}) => {
  // Center: Sukhbaatar Square (47.9187, 106.9176)
  const centerLat = 47.9187;
  const centerLng = 106.9176;

  return (
    <View style={styles.container}>
      {/* Interactive Web Map: OpenStreetMap centered on Ulaanbaatar */}
      <iframe
        title="Ulaanbaatar Interactive Food Map"
        width="100%"
        height="100%"
        style={{ border: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=106.8850%2C47.8850%2C106.9450%2C47.9350&layer=mapnik&marker=${activePinVenue ? activePinVenue.lat : centerLat}%2C${activePinVenue ? activePinVenue.lng : centerLng}`}
      />

      {/* Floating Interactive Venue Pin Selector on Web */}
      <View style={styles.webOverlay}>
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>📍 Ulaanbaatar Venue Navigator (Web)</Text>
          <Text style={styles.overlaySub}>Click any venue to highlight on map</Text>
        </View>
        <ScrollView style={styles.pinList} contentContainerStyle={{ paddingBottom: 10 }}>
          {venues.map((venue, idx) => {
            const isSelected = activePinVenue?.id === venue.id;
            return (
              <TouchableOpacity
                key={venue.id}
                style={[styles.pinItem, isSelected && styles.pinItemSelected]}
                onPress={() => onSelectVenue(venue)}
              >
                <Text style={styles.pinNumber}>#{idx + 1}</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.pinName, isSelected && styles.pinNameSelected]} numberOfLines={1}>
                    {venue.name}
                  </Text>
                  <Text style={styles.pinDetails}>
                    {venue.sub_district} • ★ {venue.bayesian_score.toFixed(2)}
                  </Text>
                </View>
                {isSelected && <Text style={styles.selectedBadge}>✓ Selected</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  webOverlay: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 290,
    maxHeight: '65%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 10,
  },
  overlayHeader: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 6,
  },
  overlayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  overlaySub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  pinList: {
    maxHeight: 280,
  },
  pinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#F9FAFB',
  },
  pinItemSelected: {
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
    borderColor: '#E11D48',
  },
  pinNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
    width: 24,
  },
  pinName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  pinNameSelected: {
    color: '#E11D48',
    fontWeight: '700',
  },
  pinDetails: {
    fontSize: 10,
    color: '#6B7280',
  },
  selectedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E11D48',
  },
});
