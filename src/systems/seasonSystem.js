import { EVENTS } from '../events/events.js';

export const SEASONS = ['printemps', 'été', 'automne', 'hiver'];
export const SEASON_LENGTH = 600; // ~2 min à 5 ticks/s
export const WINTER = 3;

// lecture seule de la saison courante, partagée par les systèmes concernés
export function isWinter(world) {
    const seasonId = world.query('season')[0];
    if (seasonId === undefined) {
        return false;
    }
    return world.getComponent(seasonId, 'season').index === WINTER;
}

// porteur du cycle des saisons : un compteur de ticks sur une entité-composant
// singleton `season` (sérialisée nativement). Émet `season.changed` au franchissement.
export class SeasonSystem {
    update(world, eventBus) {
        let seasonId = world.query('season')[0];
        if (seasonId === undefined) {
            seasonId = world.createEntity();
            world.addComponent(seasonId, 'season', { ticks: 0, index: 0 });
        }
        const season = world.getComponent(seasonId, 'season');
        season.ticks++;
        const index = Math.floor(season.ticks / SEASON_LENGTH) % SEASONS.length;
        if (index !== season.index) {
            season.index = index;
            eventBus.emit(EVENTS.SEASON_CHANGED, {
                season: SEASONS[index],
                isWinter: index === WINTER,
            });
        }
    }
}
