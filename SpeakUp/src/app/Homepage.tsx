import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/100?img=1' }} // Placeholder profile image
              style={styles.profileImage} 
            />
            <View>
              <Text style={styles.logoText}>SpeakUp</Text>
              <Text style={styles.greetingText}>Hi, Alex! 👋</Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 5 Days</Text>
            </View>
            <TouchableOpacity style={styles.bellIcon}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* OVERALL FLUENCY CARD */}
        <View style={styles.card}>
          <View style={styles.fluencyHeader}>
            <View>
              <View style={styles.geminiBadge}>
                <Ionicons name="sparkles" size={12} color="#008E8F" />
                <Text style={styles.geminiBadgeText}>Gemini Evaluated</Text>
              </View>
              <Text style={styles.cardTitle}>Overall Fluency Score</Text>
              <Text style={styles.cardSubtitle}>Top 12% among peer speakers</Text>
              
              <View style={styles.trendRow}>
                <Ionicons name="trending-up" size={16} color="#00B59C" />
                <Text style={styles.trendText}>+6 pts this week</Text>
              </View>
            </View>
            
            {/* Mock Circular Progress */}
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>84</Text>
              <Text style={styles.scoreMax}>/ 100</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Pace</Text>
              <Text style={styles.metricValue}>142 wpm</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Fillers</Text>
              <Text style={[styles.metricValue, { color: '#00B59C' }]}>1.2%</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Clarity</Text>
              <Text style={styles.metricValue}>92%</Text>
            </View>
          </View>
        </View>

        {/* START SPEAKING PRACTICE CARD */}
        <View style={[styles.card, styles.practiceCard]}>
          <View style={styles.practiceHeader}>
            <View style={styles.telemetryBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.telemetryText}>Live AI Telemetry Ready</Text>
            </View>
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic" size={24} color="#3924B7" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.practiceTitle}>Start Speaking Practice</Text>
          <Text style={styles.practiceSubtitle}>Real-time cadence, fillers & tone coach</Text>
          
          <Text style={styles.scenarioLabel}>Select Target Scenario:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scenarioScroll}>
            <TouchableOpacity style={styles.scenarioPill}>
              <Ionicons name="rocket-outline" size={16} color="#3924B7" />
              <Text style={styles.scenarioText}>Elevator Pitch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scenarioPillDark}>
              <Ionicons name="briefcase-outline" size={16} color="#fff" />
              <Text style={styles.scenarioTextDark}>Job Interview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scenarioPillDark}>
              <Ionicons name="book-outline" size={16} color="#fff" />
              <Text style={styles.scenarioTextDark}>Storytelling</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* DAILY GEMINI TIP */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <View style={styles.tipIconBox}>
              <Ionicons name="bulb-outline" size={20} color="#3924B7" />
            </View>
            <View>
              <Text style={styles.tipTitle}>Daily Gemini Tip</Text>
              <Text style={styles.tipSubtitle}>Filler Word Reduction</Text>
            </View>
          </View>
          <Text style={styles.tipBody}>
            "When you feel the impulse to say <Text style={styles.highlightPill}>'um'</Text> or <Text style={styles.highlightPill}>'like'</Text>, ground your breath and pause for 1 second. Silence conveys confidence, not hesitation."
          </Text>
        </View>

        {/* RECENT SPEECHES */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Speeches</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Speech Item 1 */}
        <TouchableOpacity style={styles.speechItem}>
          <View style={[styles.speechIconBox, { backgroundColor: '#EBE9FE' }]}>
            <MaterialCommunityIcons name="waveform" size={24} color="#3924B7" />
          </View>
          <View style={styles.speechDetails}>
            <Text style={styles.speechTitle}>Project Proposal</Text>
            <Text style={styles.speechMeta}>Today, 10:24 AM  •  3m 12s</Text>
          </View>
          <View style={styles.speechScore}>
            <View style={[styles.scoreBadge, { backgroundColor: '#E0F7FA' }]}>
              <Ionicons name="star" size={12} color="#004D40" />
              <Text style={[styles.scoreBadgeText, { color: '#004D40' }]}>88/100</Text>
            </View>
            <Text style={[styles.scoreStatus, { color: '#008E8F' }]}>Fluent Cadence</Text>
          </View>
        </TouchableOpacity>

        {/* Speech Item 2 */}
        <TouchableOpacity style={styles.speechItem}>
          <View style={[styles.speechIconBox, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="git-commit-outline" size={24} color="#4B5563" />
          </View>
          <View style={styles.speechDetails}>
            <Text style={styles.speechTitle}>Impression Speech</Text>
            <Text style={styles.speechMeta}>Yesterday  •  5m 45s</Text>
          </View>
          <View style={styles.speechScore}>
            <View style={[styles.scoreBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.scoreBadgeText, { color: '#991B1B' }]}>76/100</Text>
            </View>
            <Text style={[styles.scoreStatus, { color: '#DC2626' }]}>4 Filler Words</Text>
          </View>
        </TouchableOpacity>

        {/* Speech Item 3 */}
        <TouchableOpacity style={styles.speechItem}>
          <View style={[styles.speechIconBox, { backgroundColor: '#EBE9FE' }]}>
            <MaterialCommunityIcons name="account-tie-voice-outline" size={24} color="#3924B7" />
          </View>
          <View style={styles.speechDetails}>
            <Text style={styles.speechTitle}>Keynote Practice</Text>
            <Text style={styles.speechMeta}>Oct 14  •  8m 20s</Text>
          </View>
          <View style={styles.speechScore}>
            <View style={[styles.scoreBadge, { backgroundColor: '#E0F7FA' }]}>
              <Ionicons name="star" size={12} color="#004D40" />
              <Text style={[styles.scoreBadgeText, { color: '#004D40' }]}>91/100</Text>
            </View>
            <Text style={[styles.scoreStatus, { color: '#008E8F' }]}>Peak Delivery</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const PRIMARY_COLOR = '#3924B7';
const BG_COLOR = '#F8F9FC';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG_COLOR },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: Platform.OS === 'android' ? 24 : 0 },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  profileImage: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  logoText: { fontSize: 18, fontWeight: '800', color: PRIMARY_COLOR },
  greetingText: { fontSize: 14, color: '#555', fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  streakBadge: { backgroundColor: '#FFEFED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 12 },
  streakText: { color: '#D93025', fontSize: 13, fontWeight: '700' },
  bellIcon: { padding: 4 },

  // Cards General
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  
  // Fluency Card
  fluencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  geminiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F7FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  geminiBadgeText: { color: '#008E8F', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#666', marginBottom: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center' },
  trendText: { color: '#00B59C', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  
  scoreCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: PRIMARY_COLOR, borderRightColor: '#EBE9FE', alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 24, fontWeight: '800', color: '#333' },
  scoreMax: { fontSize: 12, color: '#888', marginTop: -4 },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
  metricItem: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '700', color: PRIMARY_COLOR },
  metricDivider: { width: 1, backgroundColor: '#F0F0F5', height: '100%' },

  // Practice Card
  practiceCard: { backgroundColor: PRIMARY_COLOR },
  practiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  telemetryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', opacity: 0.8, marginRight: 6 },
  telemetryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  micButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  practiceTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  practiceSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  scenarioLabel: { fontSize: 12, color: '#fff', fontWeight: '600', marginBottom: 10 },
  scenarioScroll: { flexDirection: 'row', marginHorizontal: -20, paddingHorizontal: 20 },
  scenarioPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
  scenarioText: { color: PRIMARY_COLOR, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  scenarioPillDark: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
  scenarioTextDark: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },

  // Tip Card
  tipCard: { backgroundColor: '#F8F6FF', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#EBE9FE' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tipIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#EBE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  tipSubtitle: { fontSize: 13, color: '#666' },
  tipBody: { fontSize: 15, color: '#444', lineHeight: 22 },
  highlightPill: { backgroundColor: '#FFD7D7', color: '#991B1B', fontWeight: '600' },

  // Recent Speeches
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  viewAllText: { fontSize: 14, fontWeight: '600', color: PRIMARY_COLOR },
  
  speechItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F5' },
  speechIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  speechDetails: { flex: 1 },
  speechTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  speechMeta: { fontSize: 12, color: '#888' },
  speechScore: { alignItems: 'flex-end' },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  scoreBadgeText: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  scoreStatus: { fontSize: 11, fontWeight: '600' },
});