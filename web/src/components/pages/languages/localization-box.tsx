const { LocalizationProvider, Localized } = require('fluent-react');
import * as React from 'react';
import { connect } from 'react-redux';
import ProgressBar from '../../progress-bar/progress-bar';
import API from '../../../services/api';
import { createCrossLocaleMessagesGenerator } from '../../../services/localization';
import StateTree from '../../../stores/tree';
import { Hr } from '../../ui/ui';
import HelpTranslateModal from './help-translate-modal';

interface Locale {
  code?: string;
  name: string;
  population: number;
}

interface PropsFromState {
  api: API;
}

interface Props extends PropsFromState {
  locale: Locale;
  progress: number;
  showCTA?: boolean;
}

interface State {
  messages: any;
  showModal: boolean;
}

class LocalizationBox extends React.Component<Props, State> {
  state: State = {
    messages: null,
    showModal: false,
  };

  async componentDidMount() {
    const { api, locale } = this.props;
    this.setState({
      messages: await createCrossLocaleMessagesGenerator(api, locale.code),
    });
  }

  toggleModal = () => this.setState({ showModal: !this.state.showModal });

  render() {
    const { locale, progress, showCTA } = this.props;
    const { messages, showModal } = this.state;

    return (
      <li className="language">
        <div className="info">
          <h2>{locale.name}</h2>
          <div className="numbers">
            <div>
              <span>Speakers</span>
              <b>{locale.population.toLocaleString()}</b>
            </div>
            <Hr />
            <div>
              <span>Total</span>
              <b>{Math.round(progress * 100)}%</b>
            </div>
            <ProgressBar progress={progress} />
          </div>
        </div>
        {showCTA &&
          messages && (
            <React.Fragment>
              {showModal && (
                <HelpTranslateModal
                  locale={locale}
                  onRequestClose={this.toggleModal}
                />
              )}
              <LocalizationProvider messages={messages}>
                <Localized id="get-involved-button">
                  <button onClick={this.toggleModal} />
                </Localized>
              </LocalizationProvider>
            </React.Fragment>
          )}
      </li>
    );
  }
}

export default connect<PropsFromState>(({ api }: StateTree) => ({ api }))(
  LocalizationBox
);
