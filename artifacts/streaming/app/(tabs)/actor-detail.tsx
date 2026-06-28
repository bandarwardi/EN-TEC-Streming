import { TVFocusable } from '@/components/TVFocusable';
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator, 
  useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/store/app-store';
import { MovieCard } from '@/components/MovieCard';

const TMDB_API_KEY = '2eae50aadf0d62874cdc2a281e7130cd';

export default function ActorDetailScreen() {
  const params = useLocalSearchParams<{ name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const getChannelsByType = useAppStore(s => s.getChannelsByType);

  const [loading, setLoading] = useState(true);
  const [actorDetails, setActorDetails] = useState<any>(null);
  const [availableContent, setAvailableContent] = useState<any[]>([]);
  const [knownFor, setKnownFor] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchActor() {
      if (!params.name) return;
      try {
        setLoading(true);
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(params.name)}`);
        const searchData = await searchRes.json();
        
        if (!active) return;
        
        if (searchData.results && searchData.results.length > 0) {
          const person = searchData.results[0];
          
          const detailRes = await fetch(`https://api.themoviedb.org/3/person/${person.id}?api_key=${TMDB_API_KEY}`);
          const detailData = await detailRes.json();
          
          if (!active) return;
          setActorDetails(detailData);

          const creditsRes = await fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${TMDB_API_KEY}`);
          const creditsData = await creditsRes.json();
          
          if (!active) return;

          const tmdbCredits = creditsData.cast || [];
          
          const localVod = await getChannelsByType('vod');
          const localSeries = await getChannelsByType('series');
          
          const available: any[] = [];
          const unavailable: any[] = [];

          const seen = new Set();
          
          const cleanTitle = (str: string) => {
            return str
              .toLowerCase()
              .replace(/\[.*?\]|\(.*?\)/g, '')
              .replace(/^(en|ar|fr|es|uk|us)\s*[-|:]\s*/i, '')
              .replace(/[^a-z0-9]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          };
          
          tmdbCredits.forEach((credit: any) => {
            const title = credit.title || credit.name;
            if (!title) return;
            if (seen.has(title)) return;
            seen.add(title);
            
            const tmdbClean = cleanTitle(title);
            if (!tmdbClean) return;
            
            let localMatch = null;
            let isSeries = false;

            localMatch = localVod.find((v: any) => {
              const vClean = cleanTitle(v.name);
              return vClean === tmdbClean || vClean.startsWith(tmdbClean + ' ');
            });

            if (!localMatch) {
              localMatch = localSeries.find((s: any) => {
                const sClean = cleanTitle(s.name);
                return sClean === tmdbClean || sClean.startsWith(tmdbClean + ' ');
              });
              if (localMatch) isSeries = true;
            }
            
            if (localMatch) {
              available.push({
                ...credit,
                localItem: localMatch,
                isSeries
              });
            } else {
              unavailable.push(credit);
            }
          });

          available.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          unavailable.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

          setAvailableContent(available);
          setKnownFor(unavailable.slice(0, 15));
        }
      } catch (e) {
        console.warn('Failed to fetch actor details', e);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchActor();

    return () => { active = false; };
  }, [params.name, getChannelsByType]);

  const profilePath = actorDetails?.profile_path 
    ? `https://image.tmdb.org/t/p/h632${actorDetails.profile_path}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(params.name || 'Unknown')}&background=1A1A1A&color=D4A843&size=500`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroSection}>
          <Image source={{ uri: profilePath }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={20} />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(10,10,10,0.8)', colors.background]}
            style={StyleSheet.absoluteFill}
          />
          
          <TVFocusable 
            style={[styles.backBtn, { top: insets.top + 10 }]} 
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={28} color="#FFF" style={styles.shadowIcon} />
          </TVFocusable>

          <View style={styles.profileContent}>
            <Image source={{ uri: profilePath }} style={[styles.profileImage, { borderColor: colors.gold }]} contentFit="cover" />
            <Text style={[styles.title, { color: '#FFF' }]}>{params.name}</Text>
            {actorDetails?.place_of_birth && (
              <Text style={[styles.subtitle, { color: colors.gold }]}>
                {actorDetails.place_of_birth}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.gold} style={{ marginVertical: 40 }} />
          ) : (
            <>
              {actorDetails?.biography ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Biography</Text>
                  <Text style={[styles.bioText, { color: colors.mutedForeground }]}>
                    {actorDetails.biography}
                  </Text>
                </View>
              ) : null}

              {availableContent.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionHeading, { color: colors.gold }]}>
                    Available on Server ({availableContent.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                    {availableContent.map((item, idx) => (
                      <MovieCard
                        key={`avail_${idx}`}
                        width={120}
                        movie={{
                          id: item.localItem.id,
                          title: item.localItem.name,
                          poster: item.localItem.logo,
                          backdrop: item.localItem.logo,
                          rating: item.vote_average || 0,
                          year: item.release_date ? parseInt(item.release_date.split('-')[0]) : 0,
                          duration: '',
                          quality: item.localItem.quality || 'FHD',
                          genres: item.localItem.category ? [item.localItem.category] : [],
                          description: item.overview || '',
                          streamUrl: item.localItem.streamUrl || ''
                        }}
                        onPress={() => {
                          if (item.isSeries) {
                            router.push({
                              pathname: '/series-detail',
                              params: { id: item.localItem.id, title: item.localItem.name, poster: item.localItem.logo, backdrop: item.localItem.logo, genres: item.localItem.category, streamUrl: item.localItem.streamUrl || '' },
                            });
                          } else {
                            router.push({
                              pathname: '/movie-detail',
                              params: { id: item.localItem.id, title: item.localItem.name, poster: item.localItem.logo, backdrop: item.localItem.logo, genres: item.localItem.category, streamUrl: item.localItem.streamUrl || '' },
                            });
                          }
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {knownFor.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Known For</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                    {knownFor.map((item, idx) => (
                      <View key={`unavail_${idx}`} style={[styles.unavailCard, { backgroundColor: colors.surface }]}>
                        <Image 
                          source={{ uri: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 'https://via.placeholder.com/150' }} 
                          style={styles.unavailPoster} 
                          contentFit="cover" 
                        />
                        <View style={styles.unavailOverlay}>
                          <Text style={styles.unavailText}>Not on Server</Text>
                        </View>
                        <Text style={[styles.unavailTitle, { color: colors.text }]} numberOfLines={2}>
                          {item.title || item.name}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    height: 350,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shadowIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileContent: {
    alignItems: 'center',
    zIndex: 5,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
  },
  hList: {
    paddingBottom: 8,
    gap: 16,
  },
  unavailCard: {
    width: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unavailPoster: {
    width: '100%',
    aspectRatio: 2/3,
    opacity: 0.5,
  },
  unavailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
  },
  unavailTitle: {
    fontSize: 12,
    fontWeight: '600',
    padding: 8,
  }
});
