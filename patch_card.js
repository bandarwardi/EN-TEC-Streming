const fs = require('fs');
let code = fs.readFileSync('C:/streaming/artifacts/streaming/app/playlists.tsx', 'utf8');

const oldCard = code.substring(code.indexOf('renderItem={({ item }) => {'), code.indexOf('/>', code.indexOf('renderItem={({ item }) => {')));

const newCard = `renderItem={({ item }) => {
          const isActive = item.id === activePlaylistId;
          const isRefreshing = refreshingId === item.id;
          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isActive ? 'rgba(212,168,67,0.08)' : colors.surface,
                  borderColor: isActive ? colors.gold : colors.border,
                  padding: 0,
                  overflow: 'hidden'
                },
              ]}
            >
              <TVFocusable
                style={{ padding: 24 }}
                onPress={async () => {
                  await setActivePlaylist(item.id);
                  router.replace('/(tabs)');
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    {isActive && (
                      <View style={[styles.activeDot, { backgroundColor: colors.gold }]} />
                    )}
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  {isActive && (
                    <Lineicons icon={CheckCircle1Bulk} size={18} color={colors.gold} />
                  )}
                </View>

                <Text
                  style={[styles.url, { color: colors.mutedForeground, marginTop: 12 }]}
                  numberOfLines={1}
                >
                  {item.url.startsWith('xtream://')
                    ? \`Xtream Codes · \${item.name}\`
                    : item.url.startsWith('demo://')
                    ? 'Demo playlist'
                    : item.url}
                </Text>

                <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.meta, { color: colors.mutedForeground, marginBottom: 0 }]}>
                    {item.channels.toLocaleString()} channels · {item.updated}
                  </Text>
                </View>
              </TVFocusable>
              
              {!item.isDemo && (
                <View style={[styles.actions, { position: 'absolute', bottom: 24, right: 24 }]}>
                  <TVFocusable
                    style={styles.actionBtn}
                    onPress={() => handleRefresh(item.id)}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <ActivityIndicator size="small" color={colors.mutedForeground} />
                    ) : (
                      <Lineicons icon={RefreshCircle1ClockwiseBulk} size={16} color={colors.mutedForeground} />
                    )}
                  </TVFocusable>
                  <TVFocusable
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item.id, item.name)}
                  >
                    <Lineicons icon={Trash3Bulk} size={16} color={colors.destructive} />
                  </TVFocusable>
                </View>
              )}
            </View>
          );
        }}
        `;

code = code.replace(oldCard, newCard);
fs.writeFileSync('C:/streaming/artifacts/streaming/app/playlists.tsx', code);
console.log('Patched card layout');
