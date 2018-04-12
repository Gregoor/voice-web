import * as React from 'react';
import { connect, Provider } from 'react-redux';
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  withRouter,
} from 'react-router';
import { Router } from 'react-router-dom';
const { LocalizationProvider } = require('fluent-react');
import { createBrowserHistory } from 'history';
import store from '../stores/root';
import URLS from '../urls';
import {
  isMobileWebkit,
  isFocus,
  isNativeIOS,
  sleep,
  isProduction,
  replacePathLocale,
} from '../utility';
import {
  createMessagesGenerator,
  DEFAULT_LOCALE,
  LOCALES,
  negotiateLocales,
} from '../services/localization';
import API from '../services/api';
import StateTree from '../stores/tree';
import Layout from './layout/layout';

const LOAD_TIMEOUT = 5000; // we can only wait so long.

/**
 * Preload these images before revealing contents.
 * TODO: right now we load all images, which is unnecessary.
 */
const PRELOAD = [
  '/img/cv-logo-bw.svg',
  '/img/cv-logo-one-color-white.svg',
  '/img/robot-greetings.png',
  '/img/robot-listening.png',
  '/img/robot-thinking.png',
  '/img/robot-thumbs-up.png',
  '/img/wave-blue-large.png',
  '/img/wave-blue-mobile.png',
  '/img/wave-red-large.png',
  '/img/wave-red-mobile.png',
  '/img/waves/_1.svg',
  '/img/waves/_2.svg',
  '/img/waves/_3.svg',
  '/img/waves/fading.svg',
  '/img/waves/Eq.svg',
];

interface PropsFromState {
  api: API;
}

interface LocalizedPagesProps extends PropsFromState, RouteComponentProps<any> {
  userLocales: string[];
}

interface LocalizedPagesState {
  messages: any;
}

const LocalizedLayout = withRouter(
  connect<PropsFromState>(({ api }: StateTree) => ({
    api,
  }))(
    class extends React.Component<LocalizedPagesProps, LocalizedPagesState> {
      state: LocalizedPagesState = {
        messages: null,
      };

      async componentDidMount() {
        await this.prepareMessagesGenerator(this.props);
      }

      async componentWillReceiveProps(nextProps: LocalizedPagesProps) {
        if (
          nextProps.userLocales.find(
            (locale, i) => locale !== this.props.userLocales[i]
          )
        ) {
          await this.prepareMessagesGenerator(nextProps);
        }
      }

      async prepareMessagesGenerator({
        api,
        history,
        userLocales,
      }: LocalizedPagesProps) {
        const [mainLocale] = userLocales;
        const pathname = history.location.pathname;

        // Since we make no distinction between "en-US", "en-UK",... we redirect them all to "en"
        if (mainLocale.startsWith('en-')) {
          history.replace(replacePathLocale(pathname, 'en'));
          return;
        }

        if (!LOCALES.includes(mainLocale)) {
          history.replace(replacePathLocale(pathname, DEFAULT_LOCALE));
        }

        this.setState({
          messages: await createMessagesGenerator(api, userLocales),
        });
      }

      render() {
        const { messages } = this.state;
        return (
          messages && (
            <LocalizationProvider messages={messages}>
              <Layout locale={this.props.userLocales[0]} />
            </LocalizationProvider>
          )
        );
      }
    }
  )
);

const history = createBrowserHistory();

interface State {
  loaded: boolean;
}

class App extends React.Component<{}, State> {
  main: HTMLElement;
  userLocales: string[];

  state: State = {
    loaded: false,
  };

  /**
   * App will handle routing to page controllers.
   */
  constructor(props: any, context: any) {
    super(props, context);

    if (isNativeIOS()) {
      this.bootstrapIOS();
    }

    if (isFocus()) {
      document.body.classList.add('focus');
    }

    if (isMobileWebkit()) {
      document.body.classList.add('mobile-safari');
    }

    this.userLocales = negotiateLocales(navigator.languages);
  }

  /**
   * Pre-Load all images before first content render.
   */
  private preloadImages(): Promise<void> {
    return new Promise<void>(resolve => {
      let loadedSoFar = 0;
      const onLoad = () => {
        ++loadedSoFar;
        if (loadedSoFar === PRELOAD.length) {
          resolve();
        }
      };
      PRELOAD.forEach(imageUrl => {
        const image = new Image();
        image.addEventListener('load', onLoad);
        image.src = imageUrl;
      });
    });
  }

  /**
   * Perform any native iOS specific operations.
   */
  private bootstrapIOS() {
    document.body.classList.add('ios');
  }

  async componentDidMount() {
    if (!isProduction()) {
      const script = document.createElement('script');
      script.src = 'https://pontoon.mozilla.org/pontoon.js';
      document.head.appendChild(script);
    }

    await Promise.all([
      Promise.race([sleep(LOAD_TIMEOUT), this.preloadImages()]).then(() =>
        this.setState({ loaded: true })
      ),
    ]);
  }

  render() {
    return this.state.loaded ? (
      <Provider store={store}>
        <Router history={history}>
          <Switch>
            {Object.values(URLS).map(url => (
              <Route
                key={url}
                exact
                path={url || '/'}
                render={() => <Redirect to={'/' + this.userLocales[0] + url} />}
              />
            ))}
            <Route
              path="/:locale"
              render={({ match: { params: { locale } } }) => (
                <LocalizedLayout userLocales={[locale, ...this.userLocales]} />
              )}
            />
          </Switch>
        </Router>
      </Provider>
    ) : (
      <div id="spinner">
        <span />
      </div>
    );
  }
}

export default App;
