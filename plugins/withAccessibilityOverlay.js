const {
  withAndroidManifest,
  withDangerousMod,
  withAppBuildGradle,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_CLASS_NAME = '.PinduoduoAccessibilityService';

/** AndroidManifest.xml ichiga accessibility service e'lonini qo'shadi */
function withAccessibilityManifestEntry(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const alreadyExists = mainApplication.service.some(
      (s) => s['$'] && s['$']['android:name'] === SERVICE_CLASS_NAME
    );

    if (!alreadyExists) {
      mainApplication.service.push({
        $: {
          'android:name': SERVICE_CLASS_NAME,
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'true',
          'android:label': 'Pinduoduo O\'zbek Tarjimon',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.accessibilityservice.AccessibilityService',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice.accessibility_service',
              'android:resource': '@xml/accessibility_service_config',
            },
          },
        ],
      });
    }

    return config;
  });
}

/** Kotlin manba faylini, xml konfiguratsiyani va strings.xml yozuvini nusxalaydi */
function withAccessibilityNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const packageName = config.android.package;
      const packagePath = packageName.replace(/\./g, '/');

      const javaDir = path.join(
        projectRoot,
        'app/src/main/java',
        packagePath
      );
      const xmlDir = path.join(projectRoot, 'app/src/main/res/xml');
      const valuesDir = path.join(projectRoot, 'app/src/main/res/values');

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(valuesDir, { recursive: true });

      // 1) Kotlin xizmat fayli — paket nomini loyihaning haqiqiy paketiga moslaymiz
      const sourceKotlinPath = path.join(
        config.modRequest.projectRoot,
        'android-native/PinduoduoAccessibilityService.kt'
      );
      const kotlinContent = fs
        .readFileSync(sourceKotlinPath, 'utf-8')
        .replace('package com.pinduado_uzbek', `package ${packageName}`);
      fs.writeFileSync(
        path.join(javaDir, 'PinduoduoAccessibilityService.kt'),
        kotlinContent
      );

      // 2) accessibility_service_config.xml
      fs.copyFileSync(
        path.join(
          config.modRequest.projectRoot,
          'android-native/accessibility_service_config.xml'
        ),
        path.join(xmlDir, 'accessibility_service_config.xml')
      );

      // 3) strings.xml ga tavsif matnini qo'shish
      const stringsPath = path.join(valuesDir, 'strings.xml');
      let strings = fs.existsSync(stringsPath)
        ? fs.readFileSync(stringsPath, 'utf-8')
        : '<resources>\n</resources>';

      if (!strings.includes('accessibility_service_description')) {
        const descriptionLine =
          '    <string name="accessibility_service_description">' +
          'Pinduoduo ilovasidagi matnlarni o\u2018zbek tiliga tarjima qilib ' +
          'ekranga chiqarish uchun ishlatiladi.</string>\n</resources>';
        strings = strings.replace('</resources>', descriptionLine);
        fs.writeFileSync(stringsPath, strings);
      }

      return config;
    },
  ]);
}

/** app/build.gradle ga OkHttp bog'liqligini qo'shadi (tarmoq so'rovlari uchun) */
function withOkHttpDependency(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('com.squareup.okhttp3:okhttp')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {\n    implementation("com.squareup.okhttp3:okhttp:4.12.0")`
      );
    }
    return config;
  });
}

module.exports = function withAccessibilityOverlay(config) {
  config = withAccessibilityNativeFiles(config);
  config = withAccessibilityManifestEntry(config);
  config = withOkHttpDependency(config);
  return config;
};
