const { checkTarget } = require('../targetting');

class BaseCardSelector {
    constructor(properties) {
        this.cardCondition = properties.cardCondition;
        this.cardType = properties.cardType;
        this.optional = properties.optional;
        this.location = this.buildLocation(properties.location);
        this.controller = properties.controller || 'any';
        this.checkTarget = properties.ignoreTargetCheck ? false : !!properties.targets;

        if (!Array.isArray(properties.cardType)) {
            this.cardType = [properties.cardType];
        }
        this.unique = properties.unique;
    }

    buildLocation(property) {
        let location = property || ['play area', 'spellboard'];
        if (!Array.isArray(location)) {
            location = [location];
        }

        return location;
    }

    findPossibleCards(context) {
        if (this.location.includes('any')) {
            if (this.controller === 'self') {
                return context.game.allCards.filter((card) => card.controller === context.player);
            } else if (this.controller === 'opponent') {
                return context.game.allCards.filter(
                    (card) => card.controller === context.player.opponent
                );
            }

            return context.game.allCards;
        }

        let upgrades = context.player.cardsInPlay.reduce(
            (array, card) => array.concat(card.upgrades),
            []
        );
        if (context.player.opponent) {
            upgrades = upgrades.concat(
                ...context.player.opponent.cardsInPlay.map((card) => card.upgrades)
            );
        }

        let possibleCards = [];
        if (this.controller !== 'opponent') {
            possibleCards = this.location.reduce((array, location) => {
                let cards = context.player.getSourceList(location);
                if (location === 'play area' || location === 'spellboard') {
                    return array.concat(
                        cards,
                        upgrades.filter((card) => card.controller === context.player),
                        context.player.phoenixborn
                    );
                }

                return array.concat(cards);
            }, possibleCards);
        }

        if (this.controller !== 'self' && context.player.opponent) {
            possibleCards = this.location.reduce((array, location) => {
                let cards = context.player.opponent.getSourceList(location);
                if (location === 'play area' || location === 'spellboard') {
                    return array.concat(
                        cards,
                        upgrades.filter((card) => card.controller === context.player.opponent),
                        context.player.opponent.phoenixborn
                    );
                }

                return array.concat(cards);
            }, possibleCards);
        }

        return possibleCards;
    }

    canTarget(card, context) {
        if (!card) {
            return false;
        }

        if (this.checkTarget) {
            if (!checkTarget(card, context)) {
                return false;
            }
        }

        if (this.controller === 'self' && card.controller !== context.player) {
            return false;
        }

        if (this.controller === 'opponent' && card.controller !== context.player.opponent) {
            return false;
        }

        if (!this.location.includes('any') && !this.location.includes(card.location)) {
            return false;
        }

        if (this.unique) {
            const selection = context.player.selectedCards;
            if (selection.some((c) => c.name === card.name)) {
                return false;
            }
        }

        return (
            (this.cardType.includes('any') || this.cardType.includes(card.getType())) &&
            this.cardCondition(card, context)
        );
    }

    getAllLegalTargets(context) {
        return this.findPossibleCards(context).filter((card) => this.canTarget(card, context));
    }

    hasEnoughSelected(selectedCards) {
        return this.optional || selectedCards.length > 0;
    }

    hasEnoughTargets(context) {
        return this.findPossibleCards(context).some((card) => this.canTarget(card, context));
    }

    defaultActivePromptTitle() {
        return 'Choose cards';
    }

    automaticFireOnSelect() {
        return false;
    }

    // eslint-disable-next-line no-unused-vars
    wouldExceedLimit(selectedCards, card) {
        return false;
    }

    // eslint-disable-next-line no-unused-vars
    hasReachedLimit(selectedCards) {
        return false;
    }

    // eslint-disable-next-line no-unused-vars
    hasExceededLimit(selectedCards) {
        return false;
    }

    formatSelectParam(cards) {
        return cards;
    }
}

module.exports = BaseCardSelector;
