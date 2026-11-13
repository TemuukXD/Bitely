import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
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
  mapRef,
}) => {
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
      initialRegion={{
        latitude: 47.9165,
        longitude: 106.9175,
        latitudeDelta: 0.032,
        longitudeDelta: 0.032,
      }}
    >
      {venues.map((venue) => {
        const isSelected = activePinVenue?.id === venue.id;
        return (
          <Marker
            key={venue.id}
            coordinate={{
              latitude: Number(venue.lat),
              longitude: Number(venue.lng),
            }}
            title={venue.name}
            description={`${venue.sub_district} • ★ ${venue.bayesian_score.toFixed(2)}`}
            onPress={() => onSelectVenue(venue)}
            pinColor={isSelected ? '#E11D48' : '#F97316'}
          />
        );
      })}
    </MapView>
  );
};
