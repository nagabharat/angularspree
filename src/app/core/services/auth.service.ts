import { of as observableOf, Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppState } from '../../interfaces';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../auth/actions/auth.actions';
import { AuthService as OauthService } from 'ng2-ui-auth';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Authenticate, User } from '../models/user';
import { delay } from 'q';
import { HttpRequest } from '@angular/common/http/src/request';
import { ToastrService, ActiveToast } from 'ngx-toastr';

@Injectable()
export class AuthService {
  /**
   * Creates an instance of AuthService.
   * @param {HttpService} http
   * @param {AuthActions} actions
   * @param {Store<AppState>} store
   *
   * @memberof AuthService
   */
  constructor(
    private http: HttpClient,
    private actions: AuthActions,
    private store: Store<AppState>,
    private oAuthService: OauthService,
    private toastrService: ToastrService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  /**
   *
   *
   * @param {Authenticate} { email, password }
   * @returns {Observable<User>}
   * @memberof AuthService
   */
  login({ email, password }: Authenticate): Observable<User> {
    const params = { spree_user: { email, password } };
    return this.http.post<User>('login.json', params).pipe(
      map(user => {
        this.setTokenInLocalStorage(user);
        this.store.dispatch(this.actions.loginSuccess());
        return user;
      }),
      tap(
        _ => this.router.navigate(['/']),
        user => this.toastrService.error(user.error.error, 'ERROR!')
      )
    );
    // catch should be handled here with the http observable
    // so that only the inner obs dies and not the effect Observable
    // otherwise no further login requests will be fired
    // MORE INFO https://youtu.be/3LKMwkuK0ZE?t=24m29s
  }

  /**
   *
   *
   * @param {User} data
   * @returns {Observable<User>}
   *
   * @memberof AuthService
   */
  register(data: User): Observable<User> {
    const params = { spree_user: data };
    return this.http.post<User>('auth/accounts', params).pipe(
      map(user => {
        this.setTokenInLocalStorage(user);
        this.store.dispatch(this.actions.loginSuccess());
        return user;
      }),
      tap(
        _ => _,
        _ => this.toastrService.error('Invalid/Existing data', 'ERROR!!')
      )
    );
    // catch should be handled here with the http observable
    // so that only the inner obs dies and not the effect Observable
    // otherwise no further login requests will be fired
    // MORE INFO https://youtu.be/3LKMwkuK0ZE?t=24m29s
  }

  /**
   *
   *
   * @param {anyUser} data
   * @returns {Observable<any>}
   * @memberof AuthService
   */
  forgetPassword(data: User): Observable<any> {
    return this.http
      .post('auth/passwords', { spree_user: data })
      .pipe(
        map(_ =>
          this.toastrService.success(
            'Password reset link has be sent to your email.',
            'Success'
          )
        ),
        tap(
          _ => _,
          _ => this.toastrService.error('Not a valid email/user', 'ERROR!!')
        )
      );
  }

  /**
   *
   *
   * @param {User} data
   * @returns {Observable<any>}
   * @memberof AuthService
   */
  updatePassword(data: User): Observable<void | ActiveToast<any>> {
    return this.http
      .put(`auth/passwords/${data.id}`, { spree_user: data })
      .pipe(
        map(_ =>
          this.toastrService.success(
            'Password updated success fully!',
            'Success'
          )
        ),
        tap(
          _ => _,
          _ => this.toastrService.error('Unable to update password', 'ERROR!')
        )
      );
  }

  /**
   *
   *
   * @returns {Observable<any>}
   *
   * @memberof AuthService
   */
  authorized(): Observable<any> {
    return this.http.get('api/v1/users').pipe(map((res: Response) => res));
    // catch should be handled here with the http observable
    // so that only the inner obs dies and not the effect Observable
    // otherwise no further login requests will be fired
    // MORE INFO https://youtu.be/3LKMwkuK0ZE?t=24m29s
  }

  /**
   *
   *
   * @returns
   *
   * @memberof AuthService
   */
  logout() {
    return this.http.get('logout.json').pipe(
      map((res: Response) => {
        // Setting token after login
        localStorage.removeItem('user');
        this.store.dispatch(this.actions.logoutSuccess());
        return res;
      })
    );
  }

  /**
   *
   *
   * @returns {{}}
   * @memberof AuthService
   */
  getTokenHeader(request: HttpRequest<any>): HttpHeaders {
    const user: User = ['undefined', null]
      .indexOf(localStorage.getItem('user')) === -1 ?
      JSON.parse(localStorage.getItem('user')) : {};

    return new HttpHeaders({
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'token-type': 'Bearer',
      access_token: user.access_token || [],
      client: user.client || [],
      uid: user.uid || [],
      'X-Spree-Token': user.spree_api_key || []
    });
  }

  /**
   *
   *
   * @private
   * @param {any} user_data
   *
   * @memberof AuthService
   */
  private setTokenInLocalStorage(user_data: any): void {
    const jsonData = JSON.stringify(user_data);
    localStorage.setItem('user', jsonData);
  }

  socialLogin(provider: string) {
    return this.oAuthService.authenticate<User>(provider).pipe(
      map(user => {
        this.setTokenInLocalStorage(user);
        return user;
      }),
      catchError(_ => {
        return observableOf('Social login failed');
      })
    );
  }
}
