const _ = require('underscore');

const AbilityContext = require('../AbilityContext.js');
const DieSelector = require('../DieSelector.js');
const EffectSource = require('../EffectSource.js');
const UiPrompt = require('./uiprompt.js');

/**
 * General purpose prompt that asks the user to select 1 or more cards.
 *
 * The properties option object has the following properties:
 * numCards           - an integer specifying the number of cards the player
 *                      must select. Set to 0 if there is no limit on the num
 *                      of cards that can be selected.
 * multiSelect        - boolean that ensures that the selected cards are sent as
 *                      an array, even if the numCards limit is 1.
 * buttons            - array of buttons for the prompt.
 * activePromptTitle  - the title that should be used in the prompt for the
 *                      choosing player.
 * waitingPromptTitle - the title that should be used in the prompt for the
 *                      opponent players.
 * maxStat            - a function that returns the maximum value that cards
 *                      selected by the prompt cannot exceed. If not specified,
 *                      then no stat limiting is done on the prompt.
 * cardStat           - a function that takes a card and returns a stat value.
 *                      Used for prompts that have a maximum stat value.
 * cardCondition      - a function that takes a card and should return a boolean
 *                      on whether that card is elligible to be selected.
 * cardType           - a string or array of strings listing which types of
 *                      cards can be selected. Defaults to the list of draw
 *                      card types.
 * onSelect           - a callback that is called once all cards have been
 *                      selected. On single card prompts this is called as soon
 *                      as an elligible card is clicked. On multi-select prompts
 *                      it is called when the done button is clicked. If the
 *                      callback does not return true, the prompt is not marked
 *                      as complete.
 * onMenuCommand      - a callback that is called when one of the additional
 *                      buttons is clicked.
 * onCancel           - a callback that is called when the player clicks the
 *                      done button without selecting any cards.
 * source             - what is at the origin of the user prompt, usually a card;
 *                      used to provide a default waitingPromptTitle, if missing
 * gameAction         - a GameAction object representing the game action to be checked on
 *                      target cards.
 * ordered            - an optional boolean indicating whether or not to display
 *                      the order of the selection during the prompt.
 */
class SelectDiePrompt extends UiPrompt {
    constructor(game, choosingPlayer, properties) {
        super(game);

        this.choosingPlayer = choosingPlayer;

        if (properties.source) {
            if (_.isString(properties.source)) {
                this.promptTitle = properties.source;
            } else {
                this.source = properties.source;
                this.promptTitle = properties.source.name;
            }
        }

        this.source =
            this.source ||
            (properties.context && properties.context.source) ||
            new EffectSource(game);
        this.promptTitle = this.promptTitle || this.source.name;

        this.properties = properties;
        this.context =
            properties.context ||
            new AbilityContext({ game: game, player: choosingPlayer, source: this.source });
        _.defaults(this.properties, this.defaultProperties());
        if (properties.gameAction) {
            if (!Array.isArray(properties.gameAction)) {
                this.properties.gameAction = [properties.gameAction];
            }

            let dieCondition = this.properties.dieCondition;
            this.properties.dieCondition = (die, context) =>
                dieCondition(die, context) &&
                this.properties.gameAction.some((gameAction) => gameAction.canAffect(die, context));
        }

        this.selector = properties.selector || DieSelector.for(this.properties);
        this.selectedDice = properties.selectedDice || [];
        this.revealTargets = properties.revealTargets;
        this.revealFunc = null;
        this.savePreviouslySelectedDice();
        this.choosingPlayer.setSelectedDice(this.selectedDice);
    }

    defaultProperties() {
        return {
            waitingPromptTitle: 'Waiting for opponent',
            buttons: [],
            controls: this.getDefaultControls(),
            diceReq: this.getDiceReq(),
            selectDie: true,
            dieCondition: () => true,
            onSelect: () => true,
            onMenuCommand: () => true,
            onCancel: () => true
        };
    }

    getDiceReq() {
        return this.properties.format
            ? this.properties.format.map((f) => {
                  if (Array.isArray(f)) {
                      return [f[0].getSummary(), f[1].getSummary()];
                  } else {
                      return f.getSummary();
                  }
              })
            : [];
    }

    getDefaultControls() {
        let targets = this.context.targets ? Object.values(this.context.targets) : [];
        targets = targets.reduce((array, target) => array.concat(target), []);
        if (targets.length === 0 && this.context.event && this.context.event.die) {
            this.targets = [this.context.event.die];
        }

        return [
            {
                type: 'targeting',
                source: this.source.getShortSummary(),
                targets: targets.map((target) => target.getShortSummary())
            }
        ];
    }

    savePreviouslySelectedDice() {
        this.previouslySelectedDice = this.choosingPlayer.selectedDice;
        this.choosingPlayer.clearSelectedDice();
    }

    continue() {
        if (!this.isComplete()) {
            this.highlightSelectableDice();
        }

        return super.continue();
    }

    highlightSelectableDice() {
        const legalDice = this.selector.getAllLegalTargets(this.context);
        // let allDice = this.selector.findPossibleDice(this.context);
        this.choosingPlayer.setSelectableDice(legalDice);

        // if (this.revealTargets && !this.revealFunc) {
        //     this.revealFunc = (die, player) =>
        //         player === this.choosingPlayer && allDice.includes(die);
        //     this.game.cardVisibility.addRule(this.revealFunc);
        // }
    }

    activeCondition(player) {
        return player === this.choosingPlayer;
    }

    activePrompt() {
        let buttons = this.properties.buttons;
        if (
            this.properties.optional ||
            (!this.selector.automaticFireOnSelect(this.context) && this.hasEnoughSelected())
        ) {
            if (buttons.every((button) => button.text !== 'Done')) {
                buttons = [{ text: 'Done', arg: 'done' }].concat(buttons);
            }
        }

        if (this.game.manualMode && !_.any(buttons, (button) => button.arg === 'cancel')) {
            buttons = buttons.concat({ text: 'Cancel Prompt', arg: 'cancel' });
        }

        return {
            selectDie: this.properties.selectDie,
            selectOrder: this.properties.ordered,
            menuTitle:
                this.properties.activePromptTitle ||
                this.selector.defaultActivePromptTitle(this.context),
            buttons: buttons,
            promptTitle: this.promptTitle,
            controls: this.properties.controls,
            diceReq: this.properties.diceReq
        };
    }

    hasEnoughSelected() {
        return (
            this.selector.hasEnoughSelected(this.selectedDice, this.context) ||
            this.selector
                .getAllLegalTargets(this.context)
                .every((die) => this.selectedDice.includes(die))
        );
    }

    waitingPrompt() {
        return { menuTitle: this.properties.waitingPromptTitle || 'Waiting for opponent' };
    }

    onDieClicked(player, die) {
        if (player !== this.choosingPlayer) {
            return false;
        }

        if (!this.checkDieCondition(die)) {
            return false;
        }

        if (!this.selectDie(die)) {
            return false;
        }

        if (
            this.selector.automaticFireOnSelect(this.context) &&
            this.selector.hasReachedLimit(this.selectedDice, this.context)
        ) {
            this.fireOnSelect();
        }
    }

    checkDieCondition(die) {
        // Always allow a card to be unselected
        if (this.selectedDice.includes(die)) {
            return true;
        }

        return (
            this.selector.canTarget(die, this.context) &&
            !this.selector.wouldExceedLimit(this.selectedDice, die)
        );
    }

    selectDie(die) {
        if (
            this.selector.hasReachedLimit(this.selectedDice, this.context) &&
            !this.selectedDice.includes(die)
        ) {
            return false;
        }

        if (!this.selectedDice.includes(die)) {
            this.selectedDice.push(die);
        } else {
            this.selectedDice = _.reject(this.selectedDice, (c) => c === die);
        }

        this.choosingPlayer.setSelectedDice(this.selectedDice);

        if (this.properties.onDieToggle) {
            this.properties.onDieToggle(this.choosingPlayer, die);
        }

        return true;
    }

    fireOnSelect() {
        let dieParam = this.selector.formatSelectParam(this.selectedDice);
        if (this.properties.onSelect(this.choosingPlayer, dieParam)) {
            this.complete();
            return true;
        }

        this.clearSelection();
        return false;
    }

    menuCommand(player, arg) {
        if (
            arg === 'cancel' ||
            (arg === 'done' && this.properties.optional && this.selectedDice.length === 0)
        ) {
            this.properties.onCancel(player);
            this.complete();
            return true;
        } else if (arg === 'done' && this.hasEnoughSelected()) {
            return this.fireOnSelect();
        } else if (this.properties.onMenuCommand(player, arg)) {
            this.complete();
            return true;
        }

        return false;
    }

    complete() {
        this.clearSelection();
        return super.complete();
    }

    clearSelection() {
        this.selectedDice = [];
        this.choosingPlayer.clearSelectedDice();
        this.choosingPlayer.clearSelectableDice();

        // Restore previous selections.
        this.choosingPlayer.setSelectedDice(this.previouslySelectedDice);

        // if (this.revealTargets && this.revealFunc) {
        //     this.game.cardVisibility.removeRule(this.revealFunc);
        //     this.revealFunc = null;
        // }
    }
}

module.exports = SelectDiePrompt;
