import { useQuery } from '@tanstack/react-query';

interface OpeningHours {
  start: string;
  end: string;
}

interface AppointmentConfig {
  id: string;
  userId: string;
  openingDays: string; // JSON string
  openingHours: string; // JSON string
  appointmentOnlyDayEnabled: boolean;
  appointmentOnlyDay: string | null;
  appointmentOnlyDayPhone: string | null;
}

async function fetchAppointmentConfig(): Promise<AppointmentConfig | null> {
  try {
    const res = await fetch('/api/admin/appointment-config');
    if (!res.ok) {
      // Si pas admin ou pas de config, retourner null
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching appointment config:', error);
    return null;
  }
}

export function useAppointmentConfig() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['appointmentConfig'],
    queryFn: fetchAppointmentConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Parser les JSON strings
  const openingDays = config?.openingDays ? JSON.parse(config.openingDays) : {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  };

  const openingHours = config?.openingHours ? JSON.parse(config.openingHours) : {
    monday: { start: '09:00', end: '18:00' },
    tuesday: { start: '09:00', end: '18:00' },
    wednesday: { start: '09:00', end: '18:00' },
    thursday: { start: '09:00', end: '18:00' },
    friday: { start: '09:00', end: '18:00' },
    saturday: { start: '10:00', end: '17:00' },
    sunday: { start: '09:00', end: '18:00' },
  };

  // Helper pour vérifier si un jour est ouvert
  const isDayOpen = (dayOfWeek: number): boolean => {
    const dayMap: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };
    const dayKey = dayMap[dayOfWeek];
    return openingDays[dayKey] || false;
  };

  // Helper pour obtenir les horaires d'un jour
  const getDayHours = (dayOfWeek: number): OpeningHours | null => {
    const dayMap: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };
    const dayKey = dayMap[dayOfWeek];
    return openingHours[dayKey] || null;
  };

  // Helper pour vérifier si un jour est "sur RDV uniquement"
  const isAppointmentOnlyDay = (dayOfWeek: number): boolean => {
    if (!config?.appointmentOnlyDayEnabled) return false;
    const dayMap: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };
    const dayKey = dayMap[dayOfWeek];
    return config.appointmentOnlyDay === dayKey;
  };

  // Helper pour obtenir le numéro de téléphone pour le jour sur RDV uniquement
  const getAppointmentOnlyPhone = (): string | null => {
    return config?.appointmentOnlyDayPhone || null;
  };

  return {
    config,
    isLoading,
    openingDays,
    openingHours,
    isDayOpen,
    getDayHours,
    isAppointmentOnlyDay,
    getAppointmentOnlyPhone,
    appointmentOnlyDayEnabled: config?.appointmentOnlyDayEnabled || false,
    appointmentOnlyDay: config?.appointmentOnlyDay || null,
  };
}

