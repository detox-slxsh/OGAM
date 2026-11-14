import logger from '../utils/logger';
import { registerToolExtension } from '../services/tools/extensions';
import { registerScreen } from '../navigation/screenRegistry';
import { registerSettingsSection } from '../components/settings/sectionRegistry';
import { registerSlot } from './slotRegistry';
import { registerHook } from './hookRegistry';
import {
  getProLicenseInfo,
  registerProEntitlementProvider,
} from '../services/proLicenseService';
import { proEntitlementLifecycle } from '../services/proEntitlementLifecycle';
import { selectHasProAccess } from '../stores/proAccessSlice';

export async function loadProFeatures(isPro?: boolean): Promise<boolean> {
  let pro: any;

  try {
    pro = require('@offgrid/pro');
  } catch {
    return false;
  }

  if (!pro) return false;

  if (typeof pro.configureProEntitlementProvider === 'function') {
    pro.configureProEntitlementProvider(registerProEntitlementProvider);
  }

  await proEntitlementLifecycle.start();

  const { useAppStore } = require('../stores/appStore');

  // Force unlocked for Android/dev build
  const active = true;
  const admitted = true;

  useAppStore.getState().setHasRegisteredPro(true);
  useAppStore.getState().setHasSavedProCredential(true);
  useAppStore.getState().setProActive(true);
  useAppStore.getState().setHasExpiredProCredential(false);

  if (typeof pro.activateSyncBootstrap === 'function') {
    pro.activateSyncBootstrap({
      registerScreen,
      registerSlot,
      registerHook,
      onEntitlementImported: async () => {
        useAppStore.getState().setHasRegisteredPro(true);
        await loadProFeatures(true);
      },
    });
  }

  pro.activate({
    registerToolExtension,
    registerScreen,
    registerSettingsSection,
    registerSlot,
    registerHook,
  });

  return true;
}