import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isAuth = false;
  private token: string; // authenticated JWT to be used for authorization in other parts
  private authStatusListener = new BehaviorSubject<boolean>(false); // "push" auth status to rest of app
  private tokenTimerObj: any;
  private expiresInDuration = 3600;

  constructor(private cookieService: CookieService) {}

  // should only be called upon successful login
  setToken() {
    this.token = this.cookieService.get('coco_auth');

    if (this.token) {
      this.isAuth = true;
      this.authStatusListener.next(true); // tell rest of app that authenticated

      this.setTokenTimer();

      // Set expiration in Local Storage if DNE
      if (!this.getExpiration()) {
        const now = new Date();
        const expirationDate = new Date(
          now.getTime() + this.expiresInDuration * 1000
        );
        this.saveExpiration(expirationDate);
      } else {
        console.log('Already set expiry');
      }
    }
  }

  getToken() {
    return this.token;
  }

  deleteTokenInCookie() {
    this.cookieService.delete('coco_auth');
  }

  // return something that's "subscribable" to indicate global auth status
  getAuthStatusListener() {
    return this.authStatusListener.asObservable();
  }

  logout() {
    this.token = '';
    this.deleteTokenInCookie();
    clearTimeout(this.tokenTimerObj);
    this.authStatusListener.next(false); // tell rest of app that we logged out
    this.clearExpiration();
  }

  getIsAuth() {
    return this.isAuth;
  }

  /**
   * logout automatically after 1h (bc JWT becomes expires then)
   * @param expiresInDuration: seconds
   */
  setTokenTimer(expiresInDuration = 3600) {
    console.log("Setting time: " + expiresInDuration);
    if (!this.token) return;

    if (this.tokenTimerObj) clearTimeout(this.tokenTimerObj); // clear any old timers

    // console.log("i've begun");
    this.tokenTimerObj = setTimeout(() => {
      this.logout();
    }, expiresInDuration * 1000); // milliseconds
  }

  // Update the expiry timer upon reload
  autoAuthUser() {
    const expirationDate = this.getExpiration();
    console.log("date: " + expirationDate);
    if (!expirationDate) {
      return;
    }
    const now = new Date();
    const expiresIn = expirationDate.getTime() - now.getTime(); // get remaining time
    // console.log("expires in: " + expiresIn / 1000);

    // if > 0, expiration is in future - good!
    if (expiresIn > 0) {
      // this.setToken();
      // this.authStatusListener.next(true);
      this.setTokenTimer(expiresIn / 1000);
    }
  }

  private saveExpiration(expirationDate: Date) {
    localStorage.setItem('expiration', expirationDate.toISOString());
  }

  private getExpiration() {
    const expirationDate = localStorage.getItem('expiration');
    // console.log(expirationDate);
    if (!expirationDate) {
      return;
    } else {
      return new Date(expirationDate);
    }
  }

  private clearExpiration() {
    localStorage.removeItem('expiration');
  }
}
