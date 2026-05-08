import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'theme-purple-dark' | 'theme-indigo-light' | 'theme-sepia' | 'theme-teal-dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentThemeSubject = new BehaviorSubject<AppTheme>('theme-purple-dark');
  currentTheme$ = this.currentThemeSubject.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  setTheme(theme: AppTheme) {
    const previousTheme = this.currentThemeSubject.value;
    this.renderer.removeClass(document.body, previousTheme);
    this.renderer.addClass(document.body, theme);
    this.currentThemeSubject.next(theme);
    localStorage.setItem('app-theme', theme);
  }

  initTheme(savedTheme?: string) {
    const theme = (savedTheme as AppTheme) || (localStorage.getItem('app-theme') as AppTheme) || 'theme-purple-dark';
    this.renderer.addClass(document.body, theme);
    this.currentThemeSubject.next(theme);
  }

  getCurrentTheme(): AppTheme {
    return this.currentThemeSubject.value;
  }
}
