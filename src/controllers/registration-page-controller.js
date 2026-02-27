import { renderRegistrationPage } from '../views/registration-view.js';

export function getRegistrationPage(_req, res) {
  res.status(200).type('html').send(renderRegistrationPage());
}
