/**
 * AlertManager class to handle alert dialog operations
 * Encapsulates alert management logic with single responsibility
 */
export class AlertManager {
  private isOpen: boolean = false;
  private title: string = '';
  private message: string = '';
  private onConfirm: () => void = () => {};

  constructor() {}

  /**
   * Check if alert is open
   */
  isOpenAlert(): boolean {
    return this.isOpen;
  }

  /**
   * Get alert title
   */
  getAlertTitle(): string {
    return this.title;
  }

  /**
   * Get alert message
   */
  getAlertMessage(): string {
    return this.message;
  }

  /**
   * Get alert confirm callback
   */
  getOnConfirmCallback(): () => void {
    return this.onConfirm;
  }

  /**
   * Show alert dialog
   */
  showAlert(title: string, message: string, onConfirm: () => void): void {
    this.isOpen = true;
    this.title = title;
    this.message = message;
    this.onConfirm = onConfirm;
  }

  /**
   * Hide alert dialog
   */
  hideAlert(): void {
    this.isOpen = false;
    this.title = '';
    this.message = '';
    this.onConfirm = () => {};
  }

  /**
   * Reset alert state
   */
  resetAlert(): void {
    this.hideAlert();
  }
}