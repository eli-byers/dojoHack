import { Routes, RouterModule } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { RegisterMembersComponent } from './register-members/register-members.component';

const APP_ROUTES: Routes = [
    { path: '', redirectTo: 'register', pathMatch: 'full' },
    { path: 'register', component: RegisterComponent, children:[
        {path: 'members', component: RegisterMembersComponent}
    ] }
    
];

export const routing = RouterModule.forRoot(APP_ROUTES);

// import { Routes, RouterModule } from '@angular/router';
// import { LoginComponent } from './login/login.component';
// import { RegistrationComponent } from './registration/registration.component';
// const APP_ROUTES: Routes = [
//     { path: '', redirectTo: 'login', pathMatch: 'full' },
//     { path: 'login', component: LoginComponent },
//     { path: 'registration', component: RegistrationComponent },
//     { path: 'task', component: TaskComponent, children:[
// 		{ path: 'public', component: TaskPublicComponent },
// 		{ path: 'private', component: TaskPrivateComponent }
//     ]}
// ];
// export const routing = RouterModule.forRoot(APP_ROUTES);