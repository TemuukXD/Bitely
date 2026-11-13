import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ScrollView,
  TextInput,
  Image,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Venue, Review, SocialPost, SortOption } from './src/types/models';
import {
  FALLBACK_VENUES,
  FALLBACK_REVIEWS,
  FALLBACK_POSTS,
} from './src/data/fallbackUlaanbaatarData';
import {
  resolveDefaultApiUrl,
  fetchWithTimeout,
  formatMnt,
  renderPriceSymbols,
} from './src/utils/api';
import { VenueDetailModal } from './src/components/VenueDetailModal';
import { CreateNoteModal } from './src/components/CreateNoteModal';

const CUISINE_FILTERS = [
  'All',
  'Hotpot',
  'Mongolian',
  'Japanese',
  'European',
  'Steakhouse',
  'Korean',
  'Chinese',
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'smart_rank', label: '⚡ Smart Rank' },
  { key: 'rating', label: '★ Bayesian Score' },
  { key: 'distance', label: '📍 Nearest' },
  { key: 'price_asc', label: '₮ Lowest Spend' },
];

interface MapErrorBoundaryProps {
  onSwitchToList: () => void;
  children: React.ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('Map rendering failed natively:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.mapFallbackContainer}>
          <Text style={styles.mapFallbackIcon}>📍</Text>
          <Text style={styles.mapFallbackTitle}>Map Unavailable in Expo Go</Text>
          <Text style={styles.mapFallbackSubtitle}>
            Native Google Play services or map configuration is not available on this device. Explore all restaurants in List view.
          </Text>
          <TouchableOpacity style={styles.mapFallbackButton} onPress={this.props.onSwitchToList}>
            <Text style={styles.mapFallbackButtonText}>Switch to List View</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const mapRef = useRef<MapView | null>(null);

  // Navigation & View Mode (Default to 'list' for instant, crash-free first load)
  const [activeTab, setActiveTab] = useState<'explore' | 'moments' | 'saved'>('explore');
  const [exploreViewMode, setExploreViewMode] = useState<'map' | 'list'>('list');

  // API & Data State (Initialized immediately with Ulaanbaatar fallback data for 0ms startup)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(resolveDefaultApiUrl);
  const [customUrlInput, setCustomUrlInput] = useState<string>(resolveDefaultApiUrl);
  const [isApiOnline, setIsApiOnline] = useState<boolean>(false);

  const [venues, setVenues] = useState<Venue[]>(FALLBACK_VENUES);
  const [reviewsByVenue, setReviewsByVenue] =
    useState<Record<string, Review[]>>(FALLBACK_REVIEWS);
  const [posts, setPosts] = useState<SocialPost[]>(FALLBACK_POSTS);

  // Filter & Selection State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [maxPriceBand, setMaxPriceBand] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('smart_rank');

  const [activePinVenue, setActivePinVenue] = useState<Venue | null>(FALLBACK_VENUES[0] ?? null);
  const [detailModalVenue, setDetailModalVenue] = useState<Venue | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState<boolean>(false);

  // User Engagement State
  const [bookmarkedVenueIds, setBookmarkedVenueIds] = useState<string[]>([
    '22222222-2222-4222-8222-222222222201',
    '22222222-2222-4222-8222-222222222211',
  ]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);

  // Sync with Live Backend API when available
  const syncWithBackend = useCallback(
    async (overrideUrl?: string) => {
      const targetUrl = (overrideUrl || apiBaseUrl).replace(/\/$/, '');
      try {
        const params = new URLSearchParams({
          lat: '47.9187',
          lng: '106.9176',
          radius_m: '15000',
          sort: sortBy,
        });
        if (selectedCuisine !== 'All') params.set('cuisine', selectedCuisine);
        if (maxPriceBand) params.set('max_price_band', String(maxPriceBand));
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const [venuesRes, postsRes] = await Promise.all([
          fetchWithTimeout(`${targetUrl}/api/v1/venues/discover?${params.toString()}`),
          fetchWithTimeout(`${targetUrl}/api/v1/posts/feed`),
        ]);

        if (venuesRes.ok) {
          const vData = await venuesRes.json();
          if (Array.isArray(vData.venues) && vData.venues.length > 0) {
            setVenues(vData.venues);
            setIsApiOnline(true);
          }
        }
        if (postsRes.ok) {
          const pData = await postsRes.json();
          if (Array.isArray(pData.posts) && pData.posts.length > 0) {
            setPosts(pData.posts);
          }
        }
      } catch {
        // Offline / Local Embedded Mode remains active with zero interruption
        setIsApiOnline(false);
      }
    },
    [apiBaseUrl, sortBy, selectedCuisine, maxPriceBand, searchQuery]
  );

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  // Fast Client-Side Filtering & Composite Bayesian + Distance Ranking
  const filteredVenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = venues.filter((v) => {
      if (selectedCuisine !== 'All') {
        const matchesCuisine = v.cuisine_tags.some((t) =>
          t.toLowerCase().includes(selectedCuisine.toLowerCase())
        );
        if (!matchesCuisine) return false;
      }
      if (maxPriceBand !== null && v.price_band > maxPriceBand) {
        return false;
      }
      if (q.length > 0) {
        const hay = [
          v.name,
          v.sub_district,
          ...v.cuisine_tags,
          ...(v.signature_dishes || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.bayesian_score - a.bayesian_score;
      if (sortBy === 'distance') return a.distance_meters - b.distance_meters;
      if (sortBy === 'price_asc') return a.avg_spend_mnt - b.avg_spend_mnt;
      const scoreA =
        0.7 * (a.bayesian_score / 5.0) + 0.3 * Math.exp(-a.distance_meters / 1500.0);
      const scoreB =
        0.7 * (b.bayesian_score / 5.0) + 0.3 * Math.exp(-b.distance_meters / 1500.0);
      return scoreB - scoreA;
    });
  }, [venues, searchQuery, selectedCuisine, maxPriceBand, sortBy]);

  // Keep active map pin synchronized with filtered results
  useEffect(() => {
    if (
      filteredVenues.length > 0 &&
      (!activePinVenue || !filteredVenues.some((v) => v.id === activePinVenue.id))
    ) {
      setActivePinVenue(filteredVenues[0] ?? null);
    }
  }, [filteredVenues, activePinVenue]);

  const focusVenueOnMap = useCallback((venue: Venue) => {
    setActivePinVenue(venue);
    mapRef.current?.animateToRegion(
      {
        latitude: Number(venue.lat),
        longitude: Number(venue.lng),
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      },
      320
    );
  }, []);

  const openVenueDetails = useCallback(
    async (venue: Venue) => {
      setDetailModalVenue(venue);
      try {
        const res = await fetchWithTimeout(`${apiBaseUrl}/api/v1/venues/${venue.id}`, {}, 2500);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews)) {
            setReviewsByVenue((prev) => ({ ...prev, [venue.id]: data.reviews }));
          }
        }
      } catch {
        // Fallback reviews already loaded
      }
    },
    [apiBaseUrl]
  );

  const toggleBookmarkVenue = useCallback((venueId: string) => {
    setBookmarkedVenueIds((prev) =>
      prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]
    );
  }, []);

  const handleLikePost = useCallback(
    async (postId: string) => {
      const alreadyLiked = likedPostIds.includes(postId);
      setLikedPostIds((prev) =>
        alreadyLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, like_count: p.like_count + (alreadyLiked ? -1 : 1) }
            : p
        )
      );
      if (!alreadyLiked && isApiOnline) {
        try {
          await fetchWithTimeout(`${apiBaseUrl}/api/v1/posts/${postId}/like`, {
            method: 'POST',
          });
        } catch {
          // Optimistic state preserved
        }
      }
    },
    [likedPostIds, isApiOnline, apiBaseUrl]
  );

  // Submit Structured Review & Update Bayesian Score Immediately
  const handleSubmitReview = useCallback(
    async (
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
    ) => {
      const overall = Math.round(
        (payload.score_taste +
          payload.score_environment +
          payload.score_service +
          payload.score_value) /
          4
      );
      const isExifVerified = payload.exif_lat !== undefined && payload.exif_lng !== undefined;
      const weight = isExifVerified ? 1.75 : 1.25;

      const optimisticReview: Review = {
        id: `rev-${Date.now()}`,
        venue_id: venueId,
        overall_rating: overall,
        score_taste: payload.score_taste,
        score_environment: payload.score_environment,
        score_service: payload.score_service,
        score_value: payload.score_value,
        spend_per_person_mnt: payload.spend_per_person_mnt,
        content: payload.content,
        recommended_dishes: payload.recommended_dishes,
        photo_urls: [],
        is_exif_verified: isExifVerified,
        exif_distance_meters: isExifVerified ? 26.4 : null,
        credibility_weight: weight,
        helpful_count: 1,
        created_at: new Date().toISOString(),
        user_handle: 'temuulen_ub',
        user_display_name: 'Temuulen B. (You)',
      };

      setReviewsByVenue((prev) => ({
        ...prev,
        [venueId]: [optimisticReview, ...(prev[venueId] || [])],
      }));

      // Recalculate Bayesian score locally
      setVenues((prev) =>
        prev.map((v) => {
          if (v.id !== venueId) return v;
          const nextCount = v.review_count + 1;
          const nextVerified = v.verified_review_count + (isExifVerified ? 1 : 0);
          const nextBayesian = Number(
            (
              (25 * 4.35 + v.bayesian_score * v.review_count + weight * overall) /
              (25 + v.review_count + weight)
            ).toFixed(2)
          );
          const updated: Venue = {
            ...v,
            review_count: nextCount,
            verified_review_count: nextVerified,
            bayesian_score: nextBayesian,
            avg_taste: Number(
              ((v.avg_taste * v.review_count + payload.score_taste) / nextCount).toFixed(2)
            ),
            avg_environment: Number(
              ((v.avg_environment * v.review_count + payload.score_environment) / nextCount).toFixed(2)
            ),
            avg_service: Number(
              ((v.avg_service * v.review_count + payload.score_service) / nextCount).toFixed(2)
            ),
            avg_value: Number(
              ((v.avg_value * v.review_count + payload.score_value) / nextCount).toFixed(2)
            ),
          };
          setDetailModalVenue(updated);
          setActivePinVenue(updated);
          return updated;
        })
      );

      if (isApiOnline) {
        try {
          await fetchWithTimeout(`${apiBaseUrl}/api/v1/venues/${venueId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch {
          // Local update already applied
        }
      }
    },
    [isApiOnline, apiBaseUrl]
  );

  // Create Community Social Note ("Moment")
  const handleCreatePost = useCallback(
    async (payload: {
      title: string;
      body: string;
      primary_venue_id?: string;
      location_label: string;
      dish_name: string;
      dish_price_mnt: number;
      hashtags: string[];
    }) => {
      const linkedVenue = venues.find((v) => v.id === payload.primary_venue_id);
      const newPost: SocialPost = {
        id: `post-${Date.now()}`,
        title: payload.title,
        body: payload.body,
        primary_venue_id: payload.primary_venue_id,
        location_label: payload.location_label,
        media_urls: [
          linkedVenue?.cover_image_url ||
            'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
        ],
        dish_tags: [
          {
            dish_name: payload.dish_name,
            venue_id: payload.primary_venue_id,
            price_mnt: payload.dish_price_mnt,
          },
        ],
        hashtags: payload.hashtags,
        like_count: 1,
        bookmark_count: 0,
        comment_count: 0,
        created_at: new Date().toISOString(),
        author_handle: 'temuulen_ub',
        author_name: 'Temuulen B. (You)',
        venue_name: linkedVenue?.name,
        venue_score: linkedVenue?.bayesian_score,
        venue_price_band: linkedVenue?.price_band,
      };

      setPosts((prev) => [newPost, ...prev]);

      if (isApiOnline) {
        try {
          await fetchWithTimeout(`${apiBaseUrl}/api/v1/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: payload.title,
              body: payload.body,
              primary_venue_id: payload.primary_venue_id,
              location_label: payload.location_label,
              media_urls: newPost.media_urls,
              dish_tags: newPost.dish_tags,
              hashtags: payload.hashtags,
            }),
          });
        } catch {
          // Optimistic state preserved
        }
      }
    },
    [venues, isApiOnline, apiBaseUrl]
  );

  // Render Venue Row in Full List View
  const renderVenueListItem = useCallback(
    ({ item, index }: { item: Venue; index: number }) => {
      const saved = bookmarkedVenueIds.includes(item.id);
      return (
        <TouchableOpacity
          style={styles.listCard}
          activeOpacity={0.88}
          onPress={() => openVenueDetails(item)}
        >
          <Image source={{ uri: item.cover_image_url }} style={styles.listCardImage} />
          <View style={styles.listRankBadge}>
            <Text style={styles.listRankText}>#{index + 1}</Text>
          </View>
          <View style={styles.listCardBody}>
            <View style={styles.listTitleRow}>
              <Text style={styles.listVenueName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.listScoreBadge}>
                <Text style={styles.listScoreText}>★ {item.bayesian_score.toFixed(2)}</Text>
              </View>
            </View>

            <Text style={styles.listSubText} numberOfLines={1}>
              📍 {item.sub_district}
              {item.floor_level ? ` (${item.floor_level})` : ''} •{' '}
              {(item.distance_meters / 1000).toFixed(2)} km
            </Text>

            <Text style={styles.listPriceRow}>
              {renderPriceSymbols(item.price_band)} • ~{formatMnt(item.avg_spend_mnt)}/person •{' '}
              {item.verified_review_count} EXIF Verified
            </Text>

            <View style={styles.listTagsRow}>
              {item.cuisine_tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.miniTag}>
                  <Text style={styles.miniTagText}>{tag}</Text>
                </View>
              ))}
              {saved && (
                <View style={[styles.miniTag, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.miniTagText, { color: '#B45309' }]}>★ Saved</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [bookmarkedVenueIds, openVenueDetails]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Top App Bar */}
      <View style={styles.topHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.brandLogo}>Bitely</Text>
            <View style={styles.cityPill}>
              <Text style={styles.cityPillText}>🇲🇳 Ulaanbaatar</Text>
            </View>
          </View>
          <Text style={styles.brandSub}>
            Bayesian POI Discovery • EXIF Verified Reviews • Moments
          </Text>
        </View>

        <View
          style={[
            styles.statusDotPill,
            isApiOnline ? styles.statusOnline : styles.statusOffline,
          ]}
        >
          <Text
            style={[
              styles.statusDotText,
              isApiOnline ? styles.statusOnlineText : styles.statusOfflineText,
            ]}
          >
            {isApiOnline ? '● Live PostGIS' : '● Instant Local DB'}
          </Text>
        </View>
      </View>

      {/* TAB 1: EXPLORE (MAP & RANKED LIST) */}
      {activeTab === 'explore' && (
        <View style={{ flex: 1 }}>
          {/* Search & Mode Toggle Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search Ulaanbaatar hotpot, buuz, ramen, district..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={styles.clearSearchBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.modeSwitchBtn}
                onPress={() =>
                  setExploreViewMode((prev) => (prev === 'map' ? 'list' : 'map'))
                }
              >
                <Text style={styles.modeSwitchText}>
                  {exploreViewMode === 'map' ? '☰ List' : '🗺️ Map'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cuisine Filter Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {CUISINE_FILTERS.map((cuisine) => {
                const active = selectedCuisine === cuisine;
                return (
                  <TouchableOpacity
                    key={cuisine}
                    onPress={() => setSelectedCuisine(cuisine)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {cuisine}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sort & Price Tier Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sortScroll}
            >
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setSortBy(opt.key)}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                  >
                    <Text
                      style={[styles.sortChipText, active && styles.sortChipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {[1, 2, 3, 4].map((band) => {
                const active = maxPriceBand === band;
                return (
                  <TouchableOpacity
                    key={band}
                    onPress={() => setMaxPriceBand(active ? null : band)}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                  >
                    <Text
                      style={[styles.sortChipText, active && styles.sortChipTextActive]}
                    >
                      Max {'₮'.repeat(band)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* MAP VIEW + FLOATING BOTTOM VENUE CARD */}
          {exploreViewMode === 'map' ? (
            <MapErrorBoundary onSwitchToList={() => setExploreViewMode('list')}>
              <View style={{ flex: 1 }}>
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
                  {filteredVenues.map((venue) => {
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
                        onPress={() => focusVenueOnMap(venue)}
                        pinColor={isSelected ? '#E11D48' : '#F97316'}
                      />
                    );
                  })}
                </MapView>

                {/* Horizontal Quick-Jump Venue Pill Strip on Top of Map */}
                <View style={styles.mapTopOverlay}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {filteredVenues.map((v, i) => {
                      const selected = activePinVenue?.id === v.id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          onPress={() => focusVenueOnMap(v)}
                          style={[
                            styles.mapQuickPill,
                            selected && styles.mapQuickPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.mapQuickPillText,
                              selected && styles.mapQuickPillTextSelected,
                            ]}
                          >
                            #{i + 1} {v.name.split(' (')[0]} ★{v.bayesian_score.toFixed(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Bottom Selected Venue Preview Card */}
                {activePinVenue && (
                  <View style={styles.mapBottomCard}>
                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => openVenueDetails(activePinVenue)}
                    >
                      <View style={styles.mapCardRow}>
                        <Image
                          source={{ uri: activePinVenue.cover_image_url }}
                          style={styles.mapCardThumb}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={styles.mapCardHeader}>
                            <Text style={styles.mapCardTitle} numberOfLines={1}>
                              {activePinVenue.name}
                            </Text>
                            <View style={styles.mapCardScoreBox}>
                              <Text style={styles.mapCardScoreText}>
                                ★ {activePinVenue.bayesian_score.toFixed(2)}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.mapCardLocation} numberOfLines={1}>
                            📍 {activePinVenue.sub_district}
                            {activePinVenue.floor_level
                              ? ` (${activePinVenue.floor_level})`
                              : ''}{' '}
                            • {(activePinVenue.distance_meters / 1000).toFixed(2)} km
                          </Text>

                          <Text style={styles.mapCardSpend}>
                            {renderPriceSymbols(activePinVenue.price_band)} • ~
                            {formatMnt(activePinVenue.avg_spend_mnt)}/person •{' '}
                            {activePinVenue.verified_review_count} EXIF Verified
                          </Text>

                          <View style={styles.mapCardFooterRow}>
                            <Text style={styles.mapCardDims}>
                              Taste {activePinVenue.avg_taste.toFixed(1)} • Vibe{' '}
                              {activePinVenue.avg_environment.toFixed(1)} • Value{' '}
                              {activePinVenue.avg_value.toFixed(1)}
                            </Text>
                            <Text style={styles.inspectCta}>Inspect & Review →</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </MapErrorBoundary>
          ) : (
            /* FULL RANKED LIST VIEW */
            <FlatList
              data={filteredVenues}
              keyExtractor={(item) => item.id}
              renderItem={renderVenueListItem}
              contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
              initialNumToRender={8}
            />
          )}
        </View>
      )}

      {/* TAB 2: COMMUNITY MOMENTS / SOCIAL FEED ("NOTES") */}
      {activeTab === 'moments' && (
        <View style={{ flex: 1 }}>
          <View style={styles.momentsHeaderBar}>
            <View>
              <Text style={styles.momentsTitle}>Ulaanbaatar Food Moments</Text>
              <Text style={styles.momentsSub}>
                Real dish tags linked directly to verified restaurant POIs
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newMomentBtn}
              onPress={() => setShowCreateNoteModal(true)}
            >
              <Text style={styles.newMomentBtnText}>+ Post Note</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.momentsGrid}>
            {posts.map((post) => {
              const liked = likedPostIds.includes(post.id);
              const linkedVenue = venues.find((v) => v.id === post.primary_venue_id);
              return (
                <View key={post.id} style={styles.momentCard}>
                  {post.media_urls[0] && (
                    <Image
                      source={{ uri: post.media_urls[0] }}
                      style={styles.momentImage}
                    />
                  )}

                  <View style={styles.momentBodyBox}>
                    {/* Linked POI Badge */}
                    {linkedVenue && (
                      <TouchableOpacity
                        style={styles.momentPoiBadge}
                        onPress={() => openVenueDetails(linkedVenue)}
                      >
                        <Text style={styles.momentPoiText} numberOfLines={1}>
                          📍 {linkedVenue.name} • ★ {linkedVenue.bayesian_score.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <Text style={styles.momentHeadline}>{post.title}</Text>
                    <Text style={styles.momentDescription}>{post.body}</Text>

                    {/* Dish Tags with MNT Prices */}
                    {post.dish_tags && post.dish_tags.length > 0 && (
                      <View style={styles.dishTagsRow}>
                        {post.dish_tags.map((dt, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.momentDishPill}
                            onPress={() => linkedVenue && openVenueDetails(linkedVenue)}
                          >
                            <Text style={styles.momentDishPillText}>
                              🍲 {dt.dish_name}
                              {dt.price_mnt ? ` • ${formatMnt(dt.price_mnt)}` : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Hashtags */}
                    <View style={styles.hashtagRow}>
                      {post.hashtags.map((tag) => (
                        <Text key={tag} style={styles.hashtagText}>
                          #{tag}
                        </Text>
                      ))}
                    </View>

                    {/* Author & Like Bar */}
                    <View style={styles.momentFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.smallAvatar}>
                          <Text style={styles.smallAvatarText}>
                            {post.author_name.charAt(0)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.momentAuthor}>{post.author_name}</Text>
                          <Text style={styles.momentLocLabel}>{post.location_label}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.likePill, liked && styles.likePillActive]}
                        onPress={() => handleLikePost(post.id)}
                      >
                        <Text
                          style={[styles.likePillText, liked && styles.likePillTextActive]}
                        >
                          {liked ? '❤️' : '🤍'} {post.like_count}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* TAB 3: SAVED SPOTS & SERVER CONNECTION SETTINGS */}
      {activeTab === 'saved' && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
          {/* Reviewer Credibility Card */}
          <View style={styles.profileCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarText}>T</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.profileName}>Temuulen B. (@temuulen_ub)</Text>
                <Text style={styles.profileTier}>
                  Lv.4 Ulaanbaatar Critic • Trust Weight 1.40x (1.75x with EXIF GPS)
                </Text>
              </View>
            </View>
          </View>

          {/* Saved Venues Section */}
          <Text style={styles.savedSectionTitle}>
            ★ Saved Ulaanbaatar Spots ({bookmarkedVenueIds.length})
          </Text>
          {venues
            .filter((v) => bookmarkedVenueIds.includes(v.id))
            .map((venue) => (
              <TouchableOpacity
                key={venue.id}
                style={styles.savedVenueCard}
                onPress={() => openVenueDetails(venue)}
              >
                <Image
                  source={{ uri: venue.cover_image_url }}
                  style={styles.savedVenueImg}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.savedVenueName}>{venue.name}</Text>
                  <Text style={styles.savedVenueMeta}>
                    ★ {venue.bayesian_score.toFixed(2)} • {venue.sub_district} • ~
                    {formatMnt(venue.avg_spend_mnt)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => toggleBookmarkVenue(venue.id)}>
                  <Text style={styles.removeSavedText}>Remove</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

          {/* Live Backend Server Connection Config */}
          <View style={styles.serverConfigCard}>
            <Text style={styles.savedSectionTitle}>
              🔌 Backend PostGIS Server Connection
            </Text>
            <Text style={styles.serverConfigHelp}>
              start-dev.bat automatically configures your Windows Wi-Fi IP. You can also test or switch your backend API URL here:
            </Text>
            <TextInput
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              style={styles.serverInput}
              autoCapitalize="none"
              placeholder="http://192.168.1.150:3000"
            />
            <TouchableOpacity
              style={styles.reconnectBtn}
              onPress={() => {
                setApiBaseUrl(customUrlInput.trim());
                syncWithBackend(customUrlInput.trim());
              }}
            >
              <Text style={styles.reconnectBtnText}>
                Save & Sync with PostGIS Server
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Bottom 3-Tab Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('explore')}
        >
          <Text
            style={[
              styles.navTabLabel,
              activeTab === 'explore' && styles.navTabLabelActive,
            ]}
          >
            🗺️ Explore UB
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('moments')}
        >
          <Text
            style={[
              styles.navTabLabel,
              activeTab === 'moments' && styles.navTabLabelActive,
            ]}
          >
            ✨ Moments ({posts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('saved')}
        >
          <Text
            style={[
              styles.navTabLabel,
              activeTab === 'saved' && styles.navTabLabelActive,
            ]}
          >
            ★ Saved ({bookmarkedVenueIds.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <VenueDetailModal
        venue={detailModalVenue}
        reviews={
          detailModalVenue ? reviewsByVenue[detailModalVenue.id] || [] : []
        }
        isBookmarked={
          detailModalVenue
            ? bookmarkedVenueIds.includes(detailModalVenue.id)
            : false
        }
        onClose={() => setDetailModalVenue(null)}
        onToggleBookmark={toggleBookmarkVenue}
        onSubmitReview={handleSubmitReview}
      />

      <CreateNoteModal
        visible={showCreateNoteModal}
        venues={venues}
        onClose={() => setShowCreateNoteModal(false)}
        onSubmitPost={handleCreatePost}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  brandLogo: { fontSize: 21, fontWeight: '900', color: '#E11D48', letterSpacing: -0.5 },
  cityPill: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  cityPillText: { fontSize: 11, fontWeight: '700', color: '#BE123C' },
  brandSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statusDotPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  statusOnline: { backgroundColor: '#ECFDF5' },
  statusOffline: { backgroundColor: '#EFF6FF' },
  statusDotText: { fontSize: 11, fontWeight: '700' },
  statusOnlineText: { color: '#047857' },
  statusOfflineText: { color: '#1D4ED8' },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },
  clearSearchBtn: { fontSize: 14, color: '#6B7280', paddingHorizontal: 6 },
  modeSwitchBtn: {
    marginLeft: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 13,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeSwitchText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  chipScroll: { marginTop: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: '#E11D48' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  sortScroll: { marginTop: 6, marginBottom: 2 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  sortChipActive: { borderColor: '#111827', backgroundColor: '#111827' },
  sortChipText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  sortChipTextActive: { color: '#FFFFFF' },
  mapTopOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
  },
  mapQuickPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapQuickPillSelected: { backgroundColor: '#E11D48' },
  mapQuickPillText: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  mapQuickPillTextSelected: { color: '#FFFFFF' },
  mapBottomCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  mapCardRow: { flexDirection: 'row', alignItems: 'center' },
  mapCardThumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapCardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1, marginRight: 6 },
  mapCardScoreBox: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mapCardScoreText: { fontSize: 12, fontWeight: '800', color: '#E11D48' },
  mapCardLocation: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  mapCardSpend: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 3 },
  mapCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  mapCardDims: { fontSize: 11, color: '#6B7280' },
  inspectCta: { fontSize: 12, fontWeight: '800', color: '#E11D48' },
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  listCardImage: { width: 92, height: 92, borderRadius: 12, backgroundColor: '#E5E7EB' },
  listRankBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listRankText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  listCardBody: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  listTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listVenueName: { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1, marginRight: 6 },
  listScoreBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  listScoreText: { fontSize: 12, fontWeight: '800', color: '#E11D48' },
  listSubText: { fontSize: 12, color: '#6B7280' },
  listPriceRow: { fontSize: 12, fontWeight: '600', color: '#374151' },
  listTagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  miniTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  miniTagText: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
  momentsHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  momentsTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  momentsSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  newMomentBtn: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  newMomentBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  momentsGrid: { padding: 12, paddingBottom: 32 },
  momentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  momentImage: { width: '100%', height: 190, backgroundColor: '#E5E7EB' },
  momentBodyBox: { padding: 14 },
  momentPoiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  momentPoiText: { fontSize: 11, fontWeight: '700', color: '#E11D48' },
  momentHeadline: { fontSize: 16, fontWeight: '800', color: '#111827' },
  momentDescription: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 19 },
  dishTagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  momentDishPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  momentDishPillText: { fontSize: 11, fontWeight: '700', color: '#C2410C' },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  hashtagText: { fontSize: 11, color: '#2563EB', fontWeight: '600', marginRight: 8 },
  momentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  smallAvatarText: { fontSize: 13, fontWeight: '800', color: '#374151' },
  momentAuthor: { fontSize: 12, fontWeight: '700', color: '#111827' },
  momentLocLabel: { fontSize: 11, color: '#6B7280' },
  likePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  likePillActive: { backgroundColor: '#FFE4E6' },
  likePillText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  likePillTextActive: { color: '#E11D48' },
  profileCard: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  largeAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  profileName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  profileTier: { color: '#9CA3AF', fontSize: 12, marginTop: 3 },
  savedSectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 10 },
  savedVenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedVenueImg: { width: 56, height: 56, borderRadius: 10 },
  savedVenueName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  savedVenueMeta: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  removeSavedText: { fontSize: 12, fontWeight: '700', color: '#E11D48', paddingHorizontal: 8 },
  serverConfigCard: {
    marginTop: 18,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serverConfigHelp: { fontSize: 12, color: '#4B5563', lineHeight: 18, marginBottom: 10 },
  serverInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  reconnectBtn: {
    backgroundColor: '#111827',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  reconnectBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
  },
  navTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navTabLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  navTabLabelActive: { color: '#E11D48', fontWeight: '800' },
  mapFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#F9FAFB',
  },
  mapFallbackIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  mapFallbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  mapFallbackSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 300,
  },
  mapFallbackButton: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  mapFallbackButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
