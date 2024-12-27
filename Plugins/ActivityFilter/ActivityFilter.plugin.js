/**
 * @name ActivityFilter
 * @description Customize which activities, games, or apps are displayed in your Discord status with advanced filtering and visibility options.
 * @version 1.1.3
 */

module.exports = (meta) => {
  const { Data, Webpack, Patcher, UI } = BdApi;

  const config = {
    settings: [
      {
        type: 'category',
        id: 'settings',
        name: 'Settings',
        settings: [
          {
            type: 'switch',
            id: 'newActivitiesHidden',
            name: 'Auto Hide',
            value: false,
          },
        ],
      },
      {
        type: 'category', id: 'playing', name: 'Playing', settings: [] },
      {
        type: 'category', id: 'streaming', name: 'Streaming', settings: [] },
      {
        type: 'category', id: 'listening', name: 'Listening', settings: [] },
      {
        type: 'category', id: 'watching', name: 'Watching', settings: [] },
      {
        type: 'category', id: 'competing', name: 'Competing', settings: [] },
    ],
  };

  function loadSettings() {
    const savedSettings = Data.load(meta.name, 'settings') || [];
    Object.assign(config.settings, savedSettings);
  }

  function saveSettings() {
    console.log(`[${meta.name}] Saving Settings:`, config.settings);
    Data.save(meta.name, 'settings', config.settings);
  }

  function addNewActivitiesToSettings(activities) {
    console.log(`[${meta.name}] Adding Activities to Settings:`, activities);

    const categoryMap = {
      0: 'playing',
      1: 'streaming',
      2: 'listening',
      3: 'watching',
      5: 'competing',
    };

    const generalSettings = config.settings.find(s => s.id === 'settings')?.settings || [];
    const autoHide = generalSettings.find(s => s.id === 'newActivitiesHidden')?.value || false;

    activities.forEach((activity) => {
      const { name: activityName, type: activityType } = activity;
      const category = config.settings.find(s => s.id === categoryMap[activityType]);

      if (!category || !activityName) {
        console.warn(`[${meta.name}] Skipping undefined category or activity:`, activity);
        return;
      }

      if (!category.settings.some(setting => setting.id === activityName)) {
        category.settings.push({
          type: 'switch',
          id: activityName,
          name: activityName,
          value: !autoHide,
        });
      }
    });

    saveSettings();
  }

  function patchSelfPresenceStore() {
    const selfPresenceStore = Webpack.getByKeys('getLocalPresence', 'getActivities');

    Patcher.after(meta.name, selfPresenceStore, 'getActivities', (_, args, activities) => {
      console.log(`[${meta.name}] Detected Activities:`, activities);
      addNewActivitiesToSettings(activities);
      return activities.filter(activity => {
        const category = config.settings.find(s => s.id === {
          0: 'playing', 1: 'streaming', 2: 'listening', 3: 'watching', 5: 'competing',
        }[activity.type]);
        return category && !category.settings.some(setting => setting.id === activity.name && !setting.value);
      });
    });
  }

  return {
    start() {
      loadSettings();
      patchSelfPresenceStore();
    },

    stop() {
      Patcher.unpatchAll(meta.name);
    },

    getSettingsPanel() {
      return UI.buildSettingsPanel({
        settings: config.settings,
        onChange: (category, id, value) => {
          const cat = config.settings.find(c => c.id === category);
          const setting = cat?.settings.find(s => s.id === id);
          if (setting) setting.value = value;
          saveSettings();
        },
      });
    },
  };
};
