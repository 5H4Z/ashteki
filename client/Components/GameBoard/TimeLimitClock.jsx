import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import './TimeLimitClock.scss';

class TimeLimitClock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            timer: undefined,
            timeLeft: undefined
        };
    }

    componentDidMount() {
        this.updateProps(this.props);
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(props) {
        this.updateProps(props);
    }

    updateProps(props) {
        if (props.timeLimitStarted && !this.state.timer) {
            let timer = setInterval(() => {
                let endTime = moment(this.props.timeLimitStartedAt).add(
                    this.props.timeLimit,
                    'minutes'
                );
                const difference = endTime.diff(moment());
                const d = moment.utc(difference);
                const mins = Math.trunc(difference / 1000 / 60);
                let time = mins + d.format(':ss');
                this.setState({ timeLeft: time });
            }, 1000);

            this.setState({ timer: timer });
        }
    }

    render() {
        return (
            <div className='time-limit-clock card bg-dark border-primary'>
                <h1>{this.state.timeLeft}</h1>
            </div>
        );
    }
}

TimeLimitClock.displayName = 'TimeLimitClock';
TimeLimitClock.propTypes = {
    timeLimit: PropTypes.number,
    timeLimitStarted: PropTypes.bool,
    timeLimitStartedAt: PropTypes.instanceOf(Date)
};

export default TimeLimitClock;
