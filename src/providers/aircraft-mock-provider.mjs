import { MockProvider } from './mock-provider.mjs';

export class AircraftMockProvider extends MockProvider {
  constructor() {
    super({
      id: 'aircraft-mock',
      name: 'Aircraft mock',
      data: [
        {
          id: 'air-01',
          callsign: 'FIRE01',
          tipo: 'helicopter',
          type: 'helicopter',
          latitude: 40.109,
          longitude: -8.241,
          location: { latitude: 40.109, longitude: -8.241 },
          heading: 45,
          altitude: 900,
          altitudeMeters: 900,
          velocidade: 185,
          speedKph: 185,
          timestamp: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'MOCK'
        },
        {
          id: 'air-02',
          callsign: 'TANKER12',
          tipo: 'air-tanker',
          type: 'air-tanker',
          latitude: 39.98,
          longitude: -8.02,
          location: { latitude: 39.98, longitude: -8.02 },
          heading: 280,
          altitude: 1250,
          altitudeMeters: 1250,
          velocidade: 245,
          speedKph: 245,
          timestamp: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'MOCK'
        }
      ]
    });
  }
}
