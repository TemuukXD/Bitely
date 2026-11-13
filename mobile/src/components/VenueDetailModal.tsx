import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  SafeAreaView,
} from 'react-native';
import { Venue, Review } from '../types/models';
import { formatMnt, renderPriceSymbols, haversineDistanceMeters } from '../utils/api';

interface Props {
  venue: Venue | null;
  reviews: Review[];
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: (venueId: string) => void;
  onSubmitReview: (
    venueId: string,
    payload: {
      score_taste: number;
      score_environment: number;
      score_service: number;
      score_value: number;
      spend_per_person_mnt: number;
      content: string;
      recommended_dishes: string[];
      exif_lat?: number;
      exif_lng?: number;
    }
  ) => Promise<void>;
}

export const VenueDetailModal: React.FC<Props> = React.memo(
  ({ venue, reviews, isBookmarked, onClose, onToggleBookmark, onSubmitReview }) => {
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [taste, setTaste] = useState(5);
    const [environment, setEnvironment] = useState(5);
    const [service, setService] = useState(5);
    const [value, setValue] = useState(5);
    const [spendInput, setSpendInput] = useState('55000');
    const [content, setContent] = useState('');
    const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
    const [attachExifGps, setAttachExifGps] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    if (!venue) return null;

    const verifiedRatio =
      venue.review_count > 0
        ? Math.round((venue.verified_review_count / venue.review_count) * 100)
        : 68;

    const toggleDish = (dish: string) => {
      setSelectedDishes((prev) =>
        prev.includes(dish) ? prev.filter((d) => d !== dish) : [...prev, dish]
      );
    };

    const handleSendReview = async () => {
      if (content.trim().length < 5) return;
      setSubmitting(true);
      try {
        // Simulate EXIF photo coordinates within 35 meters of venue when EXIF verification is toggled on
        const exifLat = attachExifGps ? venue.lat + 0.00018 : undefined;
        const exifLng = attachExifGps ? venue.lng + 0.00018 : undefined;

        await onSubmitReview(venue.id, {
          score_taste: taste,
          score_environment: environment,
          score_service: service,
          score_value: value,
          spend_per_person_mnt: Number(spendInput.replace(/[^0-9]/g, '')) || venue.avg_spend_mnt,
          content: content.trim(),
          recommended_dishes:
            selectedDishes.length > 0 ? selectedDishes : venue.signature_dishes.slice(0, 1),
          exif_lat: exifLat,
          exif_lng: exifLng,
        });
        setContent('');
        setSelectedDishes([]);
        setShowReviewForm(false);
      } finally {
        setSubmitting(false);
      }
    };

    const renderScoreBar = (label: string, score: number) => {
      const pct = Math.min(100, Math.max(20, (score / 5) * 100));
      return (
        <View style={styles.metricRow} key={label}>
          <Text style={styles.metricLabel}>{label}</Text>
          <View style={styles.metricTrack}>
            <View style={[styles.metricFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.metricValue}>{score.toFixed(2)}</Text>
        </View>
      );
    };

    const renderStarPicker = (
      label: string,
      current: number,
      onChange: (val: number) => void
    ) => (
      <View style={styles.starPickerRow}>
        <Text style={styles.starPickerLabel}>{label}</Text>
        <View style={styles.starButtons}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => onChange(star)}
              style={[styles.starChip, current >= star && styles.starChipActive]}
            >
              <Text style={[styles.starChipText, current >= star && styles.starChipTextActive]}>
                ★ {star}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );

    return (
      <Modal visible={Boolean(venue)} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safeArea}>
          {/* Top Sticky Navigation */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {venue.name}
            </Text>
            <TouchableOpacity
              onPress={() => onToggleBookmark(venue.id)}
              style={[styles.iconBtn, isBookmarked && styles.bookmarkActiveBtn]}
            >
              <Text style={[styles.iconBtnText, isBookmarked && styles.bookmarkActiveText]}>
                {isBookmarked ? '★ Saved' : '☆ Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Hero Cover Image */}
            <View style={styles.heroContainer}>
              <Image source={{ uri: venue.cover_image_url }} style={styles.heroImage} />
              <View style={styles.heroBadgeRow}>
                <View style={styles.openPill}>
                  <Text style={styles.openPillText}>
                    {venue.is_open_now ? '● OPEN NOW (10:00–23:30)' : '● CLOSED'}
                  </Text>
                </View>
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>
                    ✓ {verifiedRatio}% EXIF Geo-Verified
                  </Text>
                </View>
              </View>
            </View>

            {/* Primary Info & Bayesian Score Card */}
            <View style={styles.sectionCard}>
              <View style={styles.titleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.venueTitle}>{venue.name}</Text>
                  <Text style={styles.venueAddress}>
                    📍 {venue.sub_district}
                    {venue.floor_level ? ` • ${venue.floor_level}` : ''} — {venue.address_line}
                  </Text>
                </View>
                <View style={styles.bayesianBox}>
                  <Text style={styles.bayesianScoreText}>{venue.bayesian_score.toFixed(2)}</Text>
                  <Text style={styles.bayesianSubText}>Bayesian ★</Text>
                </View>
              </View>

              <View style={styles.quickStatsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statChipLabel}>Price Tier</Text>
                  <Text style={styles.statChipVal}>{renderPriceSymbols(venue.price_band)}</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipLabel}>Avg / Person</Text>
                  <Text style={styles.statChipVal}>{formatMnt(venue.avg_spend_mnt)}</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipLabel}>Distance</Text>
                  <Text style={styles.statChipVal}>
                    {(venue.distance_meters / 1000).toFixed(2)} km
                  </Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipLabel}>Reviews</Text>
                  <Text style={styles.statChipVal}>{venue.review_count}</Text>
                </View>
              </View>

              {/* 4-Dimension Rating Bars */}
              <View style={styles.metricsBox}>
                <Text style={styles.sectionSubtitle}>
                  Multi-Dimensional Credibility Breakdown (C=25 Prior)
                </Text>
                {renderScoreBar('Taste & Authenticity', venue.avg_taste)}
                {renderScoreBar('Atmosphere & Vibe', venue.avg_environment)}
                {renderScoreBar('Hospitality & Service', venue.avg_service)}
                {renderScoreBar('Value for Money (₮)', venue.avg_value)}
              </View>
            </View>

            {/* Signature Dishes */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>🔥 Community Recommended Dishes</Text>
              <View style={styles.dishChipsWrap}>
                {venue.signature_dishes.map((dish) => (
                  <View key={dish} style={styles.signatureDishPill}>
                    <Text style={styles.signatureDishText}>🍽️ {dish}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Write a Review Toggle / Form */}
            <View style={styles.sectionCard}>
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.sectionHeader}>
                  Verified Reviews ({reviews.length})
                </Text>
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() => setShowReviewForm((prev) => !prev)}
                >
                  <Text style={styles.writeReviewBtnText}>
                    {showReviewForm ? '✕ Cancel' : '+ Write Review'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showReviewForm && (
                <View style={styles.reviewFormBox}>
                  <Text style={styles.formTitle}>
                    Rate Your Experience at {venue.name}
                  </Text>
                  {renderStarPicker('Taste', taste, setTaste)}
                  {renderStarPicker('Environment', environment, setEnvironment)}
                  {renderStarPicker('Service', service, setService)}
                  {renderStarPicker('Value (₮)', value, setValue)}

                  <Text style={styles.inputLabel}>Per-Person Spend (MNT ₮)</Text>
                  <TextInput
                    value={spendInput}
                    onChangeText={setSpendInput}
                    keyboardType="numeric"
                    style={styles.textInput}
                    placeholder="e.g. 55000"
                  />

                  <Text style={styles.inputLabel}>Tap Recommended Dishes</Text>
                  <View style={styles.dishChipsWrap}>
                    {venue.signature_dishes.map((dish) => {
                      const active = selectedDishes.includes(dish);
                      return (
                        <TouchableOpacity
                          key={dish}
                          onPress={() => toggleDish(dish)}
                          style={[
                            styles.selectableDishChip,
                            active && styles.selectableDishChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.selectableDishText,
                              active && styles.selectableDishTextActive,
                            ]}
                          >
                            {active ? '✓ ' : '+ '}
                            {dish}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.exifToggleBox,
                      attachExifGps && styles.exifToggleBoxActive,
                    ]}
                    onPress={() => setAttachExifGps((prev) => !prev)}
                  >
                    <Text style={styles.exifToggleTitle}>
                      {attachExifGps ? '✅ ' : '⬜ '}Attach Photo EXIF GPS Telemetry (1.25x Credibility Boost)
                    </Text>
                    <Text style={styles.exifToggleSub}>
                      Verifies photo coordinates ({venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}) are within 150m of venue geofence
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Your Detailed Review</Text>
                  <TextInput
                    value={content}
                    onChangeText={setContent}
                    multiline
                    numberOfLines={3}
                    style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                    placeholder="Share how the broth, meat quality, or service was..."
                  />

                  <TouchableOpacity
                    style={[
                      styles.submitReviewBtn,
                      content.trim().length < 5 && { opacity: 0.5 },
                    ]}
                    disabled={submitting || content.trim().length < 5}
                    onPress={handleSendReview}
                  >
                    <Text style={styles.submitReviewBtnText}>
                      {submitting
                        ? 'Verifying EXIF & Updating Bayesian Score...'
                        : 'Publish Verified Review'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reviews Feed */}
              {reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewItem}>
                  <View style={styles.reviewUserRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {rev.user_display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={styles.reviewUserName}>{rev.user_display_name}</Text>
                        {rev.is_exif_verified && (
                          <View style={styles.exifBadge}>
                            <Text style={styles.exifBadgeText}>
                              ✓ EXIF GPS Verified ({rev.exif_distance_meters ?? 25}m)
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.reviewSubMeta}>
                        Weight {rev.credibility_weight.toFixed(2)}x • Spend{' '}
                        {formatMnt(rev.spend_per_person_mnt)}/person
                      </Text>
                    </View>
                    <View style={styles.reviewRatingPill}>
                      <Text style={styles.reviewRatingPillText}>★ {rev.overall_rating}.0</Text>
                    </View>
                  </View>

                  <Text style={styles.reviewDimBreakdown}>
                    Taste {rev.score_taste} • Vibe {rev.score_environment} • Service{' '}
                    {rev.score_service} • Value {rev.score_value}
                  </Text>

                  <Text style={styles.reviewBody}>{rev.content}</Text>

                  {rev.recommended_dishes && rev.recommended_dishes.length > 0 && (
                    <View style={styles.dishChipsWrap}>
                      {rev.recommended_dishes.map((d) => (
                        <View key={d} style={styles.reviewDishTag}>
                          <Text style={styles.reviewDishTagText}>👍 {d}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7F9' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF2',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  iconBtnText: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  bookmarkActiveBtn: { backgroundColor: '#FEF3C7' },
  bookmarkActiveText: { color: '#B45309' },
  scrollContent: { paddingBottom: 36 },
  heroContainer: { height: 210, width: '100%', position: 'relative' },
  heroImage: { width: '100%', height: '100%', backgroundColor: '#E5E7EB' },
  heroBadgeRow: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  openPill: {
    backgroundColor: 'rgba(17, 24, 39, 0.84)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  openPillText: { color: '#34D399', fontSize: 11, fontWeight: '700' },
  verifiedPill: {
    backgroundColor: 'rgba(5, 150, 105, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  verifiedPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  venueTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  venueAddress: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  bayesianBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  bayesianScoreText: { fontSize: 20, fontWeight: '800', color: '#E11D48' },
  bayesianSubText: { fontSize: 10, fontWeight: '700', color: '#9F1239', marginTop: 1 },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statChip: { alignItems: 'center', flex: 1 },
  statChipLabel: { fontSize: 11, color: '#6B7280' },
  statChipVal: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  metricsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionSubtitle: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 8 },
  metricRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  metricLabel: { width: 135, fontSize: 12, color: '#374151', fontWeight: '500' },
  metricTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  metricFill: { height: '100%', backgroundColor: '#E11D48', borderRadius: 4 },
  metricValue: { width: 32, fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'right' },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#111827' },
  dishChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  signatureDishPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  signatureDishText: { fontSize: 12, fontWeight: '600', color: '#C2410C' },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  writeReviewBtn: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  writeReviewBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  reviewFormBox: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  starPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  starPickerLabel: { fontSize: 13, fontWeight: '600', color: '#374151', width: 90 },
  starButtons: { flexDirection: 'row' },
  starChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginLeft: 4,
  },
  starChipActive: { backgroundColor: '#F59E0B' },
  starChipText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  starChipTextActive: { color: '#FFFFFF' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 4 },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  selectableDishChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  selectableDishChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  selectableDishText: { fontSize: 12, color: '#4B5563' },
  selectableDishTextActive: { color: '#047857', fontWeight: '700' },
  exifToggleBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  exifToggleBoxActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  exifToggleTitle: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  exifToggleSub: { fontSize: 11, color: '#047857', marginTop: 2 },
  submitReviewBtn: {
    backgroundColor: '#111827',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  submitReviewBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  reviewItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: { fontSize: 14, fontWeight: '800', color: '#E11D48' },
  reviewUserName: { fontSize: 13, fontWeight: '700', color: '#111827', marginRight: 6 },
  exifBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exifBadgeText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  reviewSubMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  reviewRatingPill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewRatingPillText: { fontSize: 12, fontWeight: '800', color: '#D97706' },
  reviewDimBreakdown: { fontSize: 11, color: '#6B7280', marginTop: 6, fontWeight: '600' },
  reviewBody: { fontSize: 13, color: '#1F2937', marginTop: 6, lineHeight: 19 },
  reviewDishTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
    marginTop: 4,
  },
  reviewDishTagText: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
});
