import React, {Component} from 'react';

import Modal from '../base/Modal';
import ModalBody from '../base/ModalBody';
import ModalHeader from '../base/ModalHeader';
import ModalFooter from '../base/ModalFooter';
import * as session from '../../../backend/sync/session';
import {getModal} from './index';
import LoginModal from './LoginModal';

class SignupModal extends Component {
  constructor (props) {
    super(props);
    this.state = {step: 1}
  }

  async _handleSignup (e) {
    e.preventDefault();

    const email = this._emailInput.value;
    const password = this._passwordInput.value;
    const firstName = this._nameFirstInput.value;
    const lastName = this._nameLastInput.value;

    try {
      await session.signup(firstName, lastName, email, password);
      this.setState({step: 2});
    } catch (e) {
      // TODO: Handle failures
      console.error('Failed to signup', e)
    }
  }

  _handleLogin (e) {
    e.preventDefault();

    this.modal.hide();
    getModal(LoginModal).show()
  }

  show () {
    this.setState({step: 1});
    this.modal.show();
    setTimeout(() => this._nameFirstInput.focus(), 200);
  }

  render () {
    if (this.state.step === 1) {
      return (
        <Modal ref={m => this.modal = m} {...this.props}>
          <form onSubmit={this._handleSignup.bind(this)}>
            <ModalHeader>Sign Up For a New Account</ModalHeader>
            <ModalBody className="pad">
              <label htmlFor="signup-name-first">First Name</label>
              <div className="form-control form-control--outlined">
                <input type="text"
                       required="required"
                       id="signup-name-first"
                       name="signup-name-first"
                       placeholder="Jane"
                       ref={n => this._nameFirstInput = n}/>
              </div>
              <label htmlFor="signup-name-last">Last Name</label>
              <div className="form-control form-control--outlined">
                <input type="text"
                       id="signup-name-last"
                       name="signup-name-last"
                       placeholder="Doe"
                       ref={n => this._nameLastInput = n}/>
              </div>
              <label htmlFor="signup-email">Email Address</label>
              <div className="form-control form-control--outlined">
                <input type="email"
                       required="required"
                       id="signup-email"
                       name="signup-email"
                       placeholder="me@mydomain.com"
                       ref={n => this._emailInput = n}/>
              </div>
              <label htmlFor="signup-password">Password <span
                className="faint">(minimum 6 characters)</span></label>
              <div className="form-control form-control--outlined">
                <input type="password"
                       required="required"
                       pattern=".{6,}"
                       id="signup-password"
                       name="signup-password"
                       placeholder="•••••••••••••"
                       ref={n => this._passwordInput = n}/>
              </div>
            </ModalBody>
            <ModalFooter>
              <button type="submit" className="pull-right btn">
                Create Account
              </button>
              <div className="pad">
                Already have an account?
                {" "}
                <a href="#" onClick={this._handleLogin.bind(this)}>Login</a>
              </div>
            </ModalFooter>
          </form>
        </Modal>
      )
    } else {
      return (
        <Modal ref={m => this.modal = m} {...this.props}>
          <ModalHeader>Account Created</ModalHeader>
          <ModalBody className="pad">
            <h1>Please verify your account</h1>
            <p>
              A verification email has been sent to your email address. Once
              you have received it, you may login.
            </p>
          </ModalBody>
          <ModalFooter>
            <button type="submit" className="pull-right btn"
                    onClick={e => this._handleLogin(e)}>
              Proceed to Login
            </button>
          </ModalFooter>
        </Modal>
      )
    }
  }
}

SignupModal.propTypes = {};
export default SignupModal;
